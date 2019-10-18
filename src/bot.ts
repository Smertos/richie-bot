import Discord from 'discord.js';
import { interval, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import TwitchClient from "twitch";
import ChatClient from "twitch-chat-client";
import { config } from './config';
import { randomChatMessages } from './const';
import { getRandomElement } from './utils';
import { getUserStream } from './user.utils';

function isTextChannel(channel: Discord.Channel): channel is Discord.TextChannel {
    return channel.type === 'text';
}

export class Bot {

    private static minutesPerRandomMessage: number = 10;
    private static secondsPerLiveCheck: number = 30;
    private static streamIdsHistoryLimit: number = 25;

    private isStreamLive$: Observable<number> = interval(1000 * Bot.secondsPerLiveCheck).pipe(
        tap(() => this.checkIfStreamGoneLive())
    );

    private sendRandomChatMessage$: Observable<number> = interval(1000 * 60 * Bot.minutesPerRandomMessage).pipe(
        tap(() => this.sendRandomChatMessage())
    );

    constructor(
        private twitchClient: TwitchClient,
        private chatClient: ChatClient,
        private discordClient: Discord.Client,
        private parentChannel: string
    ) {}

    async checkIfStreamGoneLive(): Promise<void> {
        const { discordChannel, streamIdsHistory = [] } = config.get();
        const stream = await getUserStream(this.twitchClient, this.parentChannel);
        const channels = Array.from(this.discordClient.channels.values()).filter(isTextChannel);
        const channel = channels.find((value: Discord.TextChannel) => value.name === discordChannel);

        if (!channel) return console.log(`Error: Can't find channel #${discordChannel}`);

        if (!stream) return;
        if (streamIdsHistory.includes(stream.id)) return;

        const newStreamIdsHistory = [...streamIdsHistory, stream.id].slice(-Bot.streamIdsHistoryLimit);

        config.set('streamIdsHistory', newStreamIdsHistory);
        await config.save();

        channel.send('@here там это, стример начал стримить...');

        console.log(`${this.parentChannel} is live! Notification was sent.`);
    }

    onChatMessage = (channel: string, user: string, message: string) => {
        console.log(`${channel} <${user}> ${message}`);

        // if (user === this.parentChannel) {
        //     this.chatClient.say(this.parentChannel, `@${this.parentChannel} :pray: :pray: :pray: божественно сказано`);
        // }
    };

    async sendRandomChatMessage(): Promise<void> {
        const stream = await getUserStream(this.twitchClient, this.parentChannel);
        if (!stream) return;

        const randomChatMessage = getRandomElement(randomChatMessages);
        console.log(`I'm about to say: ${randomChatMessage}`);
        this.chatClient.say(this.parentChannel, randomChatMessage);
    }

    run(): void {
        this.isStreamLive$.subscribe();
        this.sendRandomChatMessage$.subscribe();

        this.chatClient.onPrivmsg(this.onChatMessage)
    }

}
