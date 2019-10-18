import { readFile, writeFile } from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

export type TConfig = {
    accessToken?: string;
    clientId: string;
    clientSecret: string;
    discordBotToken: string;
    discordChannel: string;
    expiry?: Date | null;
    hostname: string;
    parentChannel: string;
    port: number;
    refreshToken?: string;
    scope?: Array<string>;
    streamIdsHistory?: Array<string>;
};

export class Config {

    private store: TConfig | null = null;
    private storeFilename: string = 'config.json';

    get(): TConfig {
        if (!this.store) throw new Error('The store is still empty! Did you load config before using it?');

        return this.store;
    }

    set<T extends keyof TConfig>(key: T, value: TConfig[T]): void {
        if (!this.store) throw new Error('The store is still empty! Did you load config before using it?');

        this.store[key] = value;
    }

    async load(): Promise<TConfig> {
        const config = (await readFileAsync(this.storeFilename)).toString();
        const parsedConfig: TConfig = JSON.parse(config);
        this.store = parsedConfig;

        this.store.expiry = new Date(parsedConfig.expiry as any);

        if (!this.store) throw new Error('I guess we failed to load the config :(');

        return this.store;
    }

    async save(): Promise<void> {
        const config = JSON.stringify(this.store, null, 4);
        await writeFileAsync(this.storeFilename, config);
    }

}

export const config = new Config();

