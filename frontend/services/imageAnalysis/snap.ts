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

    const searchRadius = 10;
    const sampleRadius = 5;

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

            const sampleXMin = Math.max(0, x + i - sampleRadius) - (x + i);
            const sampleXMax = Math.min(width - 1, x + i + sampleRadius) - (x + i)
            const sampleYMin = Math.max(0, y + j - sampleRadius) - (y + j);
            const sampleYMax = Math.min(width - 1, y + j + sampleRadius) - (y + j)

            let count = 0;
            let darknessSum = 0;
            for (let n = sampleYMin; n < sampleYMax; n += pixelStep) {
                for (let m = sampleXMin; m < sampleXMax; m += 1) {
                    const samplePixel = curPixel + (m + n * width) * 4

                    const sampleR = pixels[samplePixel];
                    const sampleG = pixels[samplePixel + 1];
                    const sampleB = pixels[samplePixel + 2];

                    darknessSum += (255 - (sampleR + sampleG + sampleB) / 3) / (1 + 1 * Math.hypot(m, n))

                    count += 1;

                }
            }
            darknessSum /= count;

            if (darknessSum > maxDarkness) {
                maxDarkness = darknessSum
                delta = { dx: i / width, dy: j / height }
            }

        }
    }

    return delta

}