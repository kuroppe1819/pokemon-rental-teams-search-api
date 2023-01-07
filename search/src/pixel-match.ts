import jpeg from 'jpeg-js';
import fetch from 'node-fetch';
import pixelmatch from 'pixelmatch';

export type CompareResult = {
    percent: number;
};

export const compare = async (url1: string, url2: string): Promise<CompareResult> => {
    try {
        const res1 = await fetch(url1);
        const res2 = await fetch(url2);
        const arrayBuffer1 = await res1.arrayBuffer();
        const arrayBuffer2 = await res2.arrayBuffer();
        const rawImageData1 = jpeg.decode(arrayBuffer1);
        const rawImageData2 = jpeg.decode(arrayBuffer2);
        const width = rawImageData1.width;
        const height = rawImageData1.height;

        const mismatchedPixels = pixelmatch(rawImageData1.data, rawImageData2.data, null, width, height, {
            threshold: 0.1,
        });
        const matchPercent = Math.floor((1 - mismatchedPixels / (width * height)) * 100);

        return {
            percent: matchPercent,
        };
    } catch (err) {
        throw err;
    }
};
