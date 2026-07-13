import type { DecodedImage } from './types'

export function snapVector(
    image: DecodedImage,
    lx: number,
    ly: number,
) {
    if (!image || !lx || !ly) return null;

    const width = image.width;
    const height = image.height;

    const pixels = image.pixels

    const x = Math.round(lx * width)
    const y = Math.round(ly * height)

    const pixel = (x + y * width) * 4

    const searchRadius = 20;

    const searchXMin = Math.max(0, x - searchRadius) - x;
    const searchXMax = Math.min(width - 1, x + searchRadius) - x
    const searchYMin = Math.max(0, y - searchRadius) - y;
    const searchYMax = Math.min(width - 1, y + searchRadius) - y

    const pixelStep = 1;

    let maxDarkness = 0
    let delta = { dx: 0, dy: 0 }

    for (let j = searchYMin; j < searchYMax; j += pixelStep) {
        for (let i = searchXMin; i < searchXMax; i += 1) {
            const curPixel = pixel + (i + j * width) * 4

            const r = pixels[curPixel];
            const g = pixels[curPixel + 1];
            const b = pixels[curPixel + 2];

            const darkness = 255 - (r + g + b) / 3

            if (darkness > maxDarkness) {
                maxDarkness = darkness
                delta = { dx: i / width, dy: j / height }
            }
        }
    }

    return delta

}