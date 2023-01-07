import Client from 'twitter-api-sdk';
import type { tweetsRecentSearch as TweetsRecentSearch, TwitterResponse } from 'twitter-api-sdk/dist/types';

type NonUndefined<T> = Exclude<T, undefined>;

export type TweetsRecentSearchResult = {
    data: NonUndefined<TwitterResponse<TweetsRecentSearch>['data']>;
    media: NonUndefined<NonUndefined<TwitterResponse<TweetsRecentSearch>['includes']>['media']>;
};

export const tweetsRecentSearch = async (searchText: string, nextToken?: string): Promise<TweetsRecentSearchResult> => {
    // TODO: git にアップロードしちゃったからAPIキー発行しなおしてね
    const client = new Client(process.env.TWITTER_BEARER_TOKEN!);
    const { data, includes, meta } = await client.tweets.tweetsRecentSearch({
        query: `${searchText} has:images -is:retweet`,
        max_results: 100,
        'tweet.fields': ['author_id', 'created_at'],
        next_token: nextToken,
        expansions: ['attachments.media_keys'],
        'media.fields': ['url'],
    });
    const twitterData = data ?? [];
    const twitterMedia = includes?.media ?? [];

    if (meta !== undefined && meta.next_token) {
        const result = await tweetsRecentSearch(searchText, meta.next_token);
        const mergeData = [...twitterData, ...(result.data ?? [])];
        const mergeMedia = [...twitterMedia, ...(result.media ?? [])];

        return {
            data: mergeData,
            media: mergeMedia,
        };
    }

    return {
        data: twitterData,
        media: twitterMedia,
    };
};
