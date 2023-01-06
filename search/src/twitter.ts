import Client from 'twitter-api-sdk';

export const tweetsRecentSearch = async (searchText: string, nextToken?: string) => {
    // TODO: git にアップロードしちゃったからAPIキー発行しなおしてね
    const BEARER_TOKEN =
        'AAAAAAAAAAAAAAAAAAAAAIKSkwEAAAAAgxhnU2vb1sYfVt5nfFmivG%2F1p9U%3Dno4T3MWdM694ScyIIf7mcKBa0GuTUYQmlWh5bTXEGppNARgFJZ';
    // TODO: process.env.TWITTER_BEARER_TOKEN
    const client = new Client(BEARER_TOKEN);
    const tweet = await client.tweets.tweetsRecentSearch({
        query: `${searchText} has:images -is:retweet`,
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at'],
        next_token: nextToken,
        expansions: ['attachments.media_keys'],
        'media.fields': ['url'],
    });
    return { ...tweet };
};
