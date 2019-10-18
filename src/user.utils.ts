import TwitchClient, { HelixStream } from "twitch";

export async function getUserStream(twitchClient: TwitchClient, username: string): Promise<HelixStream | null> {
    const user = await twitchClient.helix.users.getUserByName(username);

    if (!user) return null;

    return await user.getStream();
}
