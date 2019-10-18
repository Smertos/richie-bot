import Discord from 'discord.js';
import Express, { Response, Request } from 'express';
import requestPromise from 'request-promise-native';
import TwitchClient, { AccessToken } from 'twitch';
import { Bot } from './bot';
import { config } from './config';
import { AccessTokenData } from 'twitch/lib/API/AccessToken';
import { copyFile } from 'fs';
import ChatClient from 'twitch-chat-client';

const buildAuthorizeURL = (clientId: string, redirectURL: string) =>
    `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectURL}&response_type=code&scope=chat:read+chat:edit`;

const buildTokenURL = (clientId: string, clientSecret: string, code: string, redirectURL: string) =>
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectURL}`;

const getCode = (hostname: string, port: number): Promise<string> => new Promise((resolve) => {
    const app = Express();
    const server = app.listen(port, hostname);

    app.get('/redirect', (request: Request, response: Response): void => {
        const { code } = request.query;
        response.end(code ? 'we got yo code' : 'no code provided');
        server.close(() => resolve(code));
    });
});

const getTokens = async (clientId: string, clientSecret: string, code: string, redirectURL: string): Promise<AccessToken> => {
    const tokenURL = buildTokenURL(clientId, clientSecret, code, redirectURL);
    const response: AccessTokenData = await requestPromise.post(tokenURL, { json: true });

    return new AccessToken(response);
}

const createDiscordClient = (botToken: string): Promise<Discord.Client> => new Promise((resolve) => {
    const discordClient = new Discord.Client();

    discordClient.on('ready', () => resolve(discordClient));

    discordClient.login(botToken);
});

async function init() {
    await config.load();

    const { clientId, clientSecret, discordBotToken, hostname, parentChannel, port } = config.get();
    const redirectURL = `http://${hostname}:${port}/redirect`;

    let { accessToken, expiry, refreshToken, scope } = config.get();


    if (!accessToken && !refreshToken) {
        console.log('Login and authorize as bot to proceed:');
        console.log(buildAuthorizeURL(clientId, redirectURL));

        const code = await getCode(hostname, port);
        console.log(`Code: ${code}`);

        const token = await getTokens(clientId, clientSecret, code, redirectURL);

        config.set('accessToken', token.accessToken);
        config.set('expiry', token.expiryDate);
        config.set('refreshToken', token.refreshToken);
        config.set('scope', token.scope);
        config.save();

        accessToken = token.accessToken;
        expiry = token.expiryDate;
        refreshToken = token.refreshToken;
        scope = token.scope;
    } else {
        console.log('Logging in using cached session');
    }

    const onRefresh = (token: AccessToken) => {
        config.set('accessToken', token.accessToken);
        config.set('expiry', token.expiryDate);
        config.set('refreshToken', token.refreshToken);
        config.set('scope', token.scope);

        config.save();
    };

    const twitchClient = await TwitchClient.withCredentials(
        clientId,
        accessToken,
        scope,
        refreshToken ? {
            clientSecret,
            expiry,
            onRefresh,
            refreshToken
        } : void 0
    );
    const chatClient = await ChatClient.forTwitchClient(twitchClient);
    await chatClient.connect();
    await chatClient.waitForRegistration();
    await chatClient.join(parentChannel);

    const discordClient = await createDiscordClient(discordBotToken);
    const bot = new Bot(twitchClient, chatClient, discordClient, parentChannel);

    bot.run();
}

init();
