import type { TraceImage, TracePixel } from './image';

export class SyntheticImage implements TraceImage {
    public readonly width: number;
    public readonly height: number;

    private readonly pixels: TracePixel[];

    constructor(
        width: number,
        height: number,
        background: TracePixel = {
            r: 255,
            g: 255,
            b: 255,
            a: 255,
        },
    ) {
        this.width = width;
        this.height = height;

        this.pixels = Array.from({ length: width * height }, () => ({ ...background }));
    }

    getPixel(x: number, y: number): TracePixel {
        const ix = Math.round(x);
        const iy = Math.round(y);

        if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
            return {
                r: 255,
                g: 255,
                b: 255,
                a: 255,
            };
        }

        return this.pixels[iy * this.width + ix];
    }

    setPixel(x: number, y: number, pixel: TracePixel): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }

        this.pixels[y * this.width + x] = { ...pixel };
    }
}
