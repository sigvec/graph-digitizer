import type { TracePixel } from './image';

export function luminance(pixel: TracePixel): number {
    return 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
}

export function darkness(luminanceValue: number): number {
    return 1 - luminanceValue / 255;
}
