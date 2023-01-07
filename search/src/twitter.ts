import Client from 'twitter-api-sdk';

export const tweetsRecentSearch = async (searchText: string, nextToken?: string) => {
    // TODO: git にアップロードしちゃったからAPIキー発行しなおしてね
    const client = new Client(process.env.TWITTER_BEARER_TOKEN!);
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
