import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { compare, CompareResult } from './pixel-match';
import { errorResponse } from './response';
import { tweetsRecentSearch, TweetsRecentSearchResult } from './twitter';

type PhotoMedia = {
    media_key: string;
    type: string;
    url: string;
};

type RentalTeam = {
    tweet: {
        mediaKey: string;
        tweetId: string;
        authorId: string;
        createdAt: string;
        imageUrl: string;
        text: string | undefined;
    };
    user: {
        authorId: string;
        username: string;
        name: string;
        profileImageUrl: string | undefined;
    };
};

type Unpacked<T> = T extends (infer U)[] ? U : T;

const isMatchedRentalTeamsImage = async (imageUrl: string) => {
    let compareResult: CompareResult | null = null;

    try {
        compareResult = await compare(
            // TODO: S3からベース画像を取得する
            'https://pbs.twimg.com/media/FlEG2LWaEAcHV1v.jpg',
            imageUrl,
        );
    } catch (err) {
        // console.log(err);
        // console.log(media.url);
        throw err;
    }

    if (compareResult === null) {
        throw new Error('Error: compareResult is null.');
    }

    return compareResult.percent >= 85;
};

const getRentalTeams = async (): Promise<RentalTeam[]> => {
    const res = await Promise.allSettled([
        tweetsRecentSearch('#レンタルパーティ'),
        tweetsRecentSearch('#pokemonvgc'),
        tweetsRecentSearch('#レンタルチーム'),
    ]);

    const searchResult = res
        .filter((v) => v.status === 'fulfilled')
        .flatMap<TweetsRecentSearchResult>((v) => (v as PromiseFulfilledResult<TweetsRecentSearchResult>).value);

    const dataSet = Array.from<Unpacked<TweetsRecentSearchResult['data']>>(
        searchResult
            .flatMap((v) => v.data)
            .reduce((map, current) => map.set(`${current.id}`, current), new Map())
            .values(),
    );

    const mediaSet = Array.from<PhotoMedia>(
        searchResult
            .flatMap((v) => v.media)
            .reduce((map, current) => {
                if (current.media_key === undefined) {
                    return map;
                }
                return map.set(`${current.media_key}`, current);
            }, new Map())
            .values(),
    ).filter((v) => v.type === 'photo');

    const usersSet = Array.from<Unpacked<TweetsRecentSearchResult['users']>>(
        searchResult
            .flatMap((v) => v.users)
            .reduce((map, current) => map.set(`${current.id}`, current), new Map())
            .values(),
    );

    const rentalTeams: RentalTeam[] = [];
    const compareResult = await Promise.allSettled(mediaSet.map((media) => isMatchedRentalTeamsImage(media.url)));

    for (let i = 0; i < compareResult.length; i++) {
        const result = compareResult[i];
        const media = mediaSet[i];

        if (result.status === 'fulfilled' && result.value) {
            const matchedTwitterData = dataSet.find((data) => data.attachments?.media_keys?.includes(media.media_key));

            if (
                matchedTwitterData === undefined ||
                matchedTwitterData.author_id === undefined ||
                matchedTwitterData.created_at === undefined
            ) {
                continue;
            }

            const matchedUserData = usersSet.find((user) => user.id === matchedTwitterData.author_id);

            if (matchedUserData === undefined) {
                continue;
            }

            rentalTeams.push({
                tweet: {
                    mediaKey: media.media_key,
                    tweetId: matchedTwitterData.id,
                    authorId: matchedTwitterData.author_id,
                    createdAt: matchedTwitterData.created_at,
                    imageUrl: media.url,
                    text: matchedTwitterData.text,
                },
                user: {
                    authorId: matchedUserData.id,
                    username: matchedUserData.username,
                    name: matchedUserData.name,
                    profileImageUrl: matchedUserData.profile_image_url,
                },
            });
        }
    }

    const rentalTeamsCreatedAtSortByAsc = rentalTeams.sort(
        (item1, item2) => new Date(item2.tweet.createdAt).getTime() - new Date(item1.tweet.createdAt).getTime(),
    );

    return rentalTeamsCreatedAtSortByAsc;
};

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const rentalTeams = await getRentalTeams();

    try {
        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify({
                rentalTeams,
            }),
        };
        return response;
    } catch (err: unknown) {
        console.error(err);
        return errorResponse({ statusCode: 500, message: err instanceof Error ? err.message : 'some error happened' });
    }
};
