import { APIGatewayProxyResult } from 'aws-lambda';

export const errorResponse = ({ statusCode, message }: { statusCode: number; message: string }) => {
    const response: APIGatewayProxyResult = {
        statusCode: statusCode,
        body: JSON.stringify({
            message,
        }),
    };
    return response;
};
