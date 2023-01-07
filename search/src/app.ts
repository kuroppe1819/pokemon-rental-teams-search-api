import { tweetsRecentSearch } from './twitter';
import { errorResponse } from './response';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { compare, CompareResult } from './pixel-match';

type PhotoMedia = {
    media_key: string;
    type: string;
    url: string;
};

type RentalTeams = {
    media_key: string;
    tweetId: string;
    authorId: string;
    createdAt: string;
    imageUrl: string;
    text: string | undefined;
};

const rentalTeamsRecentSearch = async (searchText: string, nextToken?: string): Promise<RentalTeams[]> => {
    const rentalTeams: RentalTeams[] = [];
    const { data: twitterData, includes, meta } = await tweetsRecentSearch(searchText, nextToken);
    const filteredPhotoMedia = includes?.media?.filter((media) => media.type === 'photo') as PhotoMedia[] | undefined;

    if (twitterData === undefined || filteredPhotoMedia === undefined) {
        // TODO: 次のツイートの検索結果を取得しにいく
        return rentalTeams;
    }

    for (const media of filteredPhotoMedia) {
        let compareResult: CompareResult | null = null;

        try {
            compareResult = await compare('https://pbs.twimg.com/media/FlEG2LWaEAcHV1v.jpg', media.url); // TODO: S3からベース画像を取得する
        } catch (err) {
            // console.log(err);
            // console.log(media.url);
            continue;
        }

        if (compareResult === null) {
            continue;
        }

        if (compareResult.percent < 85) {
            continue;
        }

        const matchedTwitterData = twitterData.find((data) => data.attachments?.media_keys?.includes(media.media_key));

        if (
            matchedTwitterData === undefined ||
            matchedTwitterData.author_id === undefined ||
            matchedTwitterData.created_at === undefined
        ) {
            continue;
        }

        rentalTeams.push({
            media_key: media.media_key,
            tweetId: matchedTwitterData.id,
            authorId: matchedTwitterData.author_id,
            createdAt: matchedTwitterData.created_at,
            imageUrl: media.url,
            text: matchedTwitterData.text,
        });
    }

    if (meta !== undefined && meta.next_token) {
        const result = await rentalTeamsRecentSearch(meta.next_token);
        const mergearray = [...rentalTeams, ...result];
        const rentalTeamsSet = Array.from<RentalTeams>(
            mergearray.reduce((map, currentitem) => map.set(currentitem.imageUrl, currentitem), new Map()).values(),
        );
        return rentalTeamsSet;
    }

    return rentalTeams;
};

const getRentalTeams = async (): Promise<RentalTeams[]> => {
    // 検索数に応じて Lambda の Memory size や Timeout の設定を変更する
    const result1 = await rentalTeamsRecentSearch('#レンタルパーティ');
    const result2 = await rentalTeamsRecentSearch('#pokemonvgc');
    const result3 = await rentalTeamsRecentSearch('#レンタルチーム');

    const mergearray = [...result1, ...result2, ...result3];
    const rentalTeamsSet = Array.from<RentalTeams>(
        mergearray.reduce((map, currentitem) => map.set(currentitem.imageUrl, currentitem), new Map()).values(),
    );

    const rentalTeamsCreatedAtSortByAsc = rentalTeamsSet.sort(
        (item1, item2) => new Date(item2.createdAt).getTime() - new Date(item1.createdAt).getTime(),
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
