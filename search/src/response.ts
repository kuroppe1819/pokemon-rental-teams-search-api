import { APIGatewayProxyResult } from 'aws-lambda';

export const errorResponse = ({ statusCode, message }: { statusCode: number; message: string }) => {
    const response: APIGatewayProxyResult = {
        statusCode: statusCode, // TODO: 大体500
        body: JSON.stringify({
            message,
        }),
    };
    return response;
};
