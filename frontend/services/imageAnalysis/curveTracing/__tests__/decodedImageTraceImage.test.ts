import { createTraceImage } from '../decodedImageTraceImage';

describe('createTraceImage', () => {
    it('maps decoded RGBA pixels to TraceImage pixels', () => {
        const image = createTraceImage({
            width: 2,
            height: 1,
            pixels: new Uint8Array([
                10, 20, 30, 255,
                200, 210, 220, 128,
            ]),
        });

        expect(image.width).toBe(2);
        expect(image.height).toBe(1);
        expect(image.getPixel(0, 0)).toEqual({
            r: 10,
            g: 20,
            b: 30,
            a: 255,
        });
        expect(image.getPixel(1, 0)).toEqual({
            r: 200,
            g: 210,
            b: 220,
            a: 128,
        });
    });

    it('returns white outside the image bounds', () => {
        const image = createTraceImage({
            width: 1,
            height: 1,
            pixels: new Uint8Array([0, 0, 0, 255]),
        });

        expect(image.getPixel(-1, 0)).toEqual({
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        });
    });
});
