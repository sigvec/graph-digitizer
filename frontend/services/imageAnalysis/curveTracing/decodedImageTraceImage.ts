import type { DecodedImage } from '../types';
import type { TraceImage, TracePixel } from './image';

export function createTraceImage(
    image: DecodedImage,
): TraceImage {
    return {
        width: image.width,
        height: image.height,
        getPixel(x: number, y: number): TracePixel {
            const pixelX = Math.round(x);
            const pixelY = Math.round(y);

            if (
                pixelX < 0 ||
                pixelX >= image.width ||
                pixelY < 0 ||
                pixelY >= image.height
            ) {
                return {
                    r: 255,
                    g: 255,
                    b: 255,
                    a: 255,
                };
            }

            const offset =
                (pixelY * image.width + pixelX) * 4;

            return {
                r: image.pixels[offset],
                g: image.pixels[offset + 1],
                b: image.pixels[offset + 2],
                a: image.pixels[offset + 3],
            };
        },
    };
}
