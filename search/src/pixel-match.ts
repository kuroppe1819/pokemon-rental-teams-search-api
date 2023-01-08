import { Lambda } from 'aws-sdk';

type PixelMatchApiResponse = {
    statusCode: number;
    body: string;
};

export type CompareResult = {
    percent: number;
};

export const compare = (imageUrl1: string, imageUrl2: string) => {
    return new Promise<CompareResult>((resolve, reject) => {
        const lambda = new Lambda();
        lambda.invoke(
            {
                FunctionName: 'pixel-match-api-PixelMatchFunction-ucgQ3ZqARhtS',
                InvocationType: 'RequestResponse',
                // prettier-ignore
                Payload: JSON.stringify({ "body": "{\"imageUrl1\":\"${imageUrl1}\",\"imageUrl2\":\"${imageUrl2}\"}" })
					.replace("${imageUrl1}", imageUrl1)
					.replace("${imageUrl2}", imageUrl2),
            },
            (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    const { body } = JSON.parse(data.Payload as string) as PixelMatchApiResponse;
                    const res = JSON.parse(body) as { matchPercent: number };
                    resolve({ percent: res.matchPercent });
                }
            },
        );
    });
};
