import type { TraceImage, TracePixel } from './image';
import { darkness, luminance } from './imageMetrics';

export interface CrossSectionSample {
    offset: number;
    darkness: number;
}

export interface CentrelineEstimate {
    offset: number;
    confidence: number;
    samples: CrossSectionSample[];
}

function sampleDarkness(image: TraceImage, x: number, y: number): number {
    const pixel: TracePixel = image.getPixel(x, y);

    return darkness(luminance(pixel));
}

export function estimateCentreline(
    image: TraceImage,
    centre: { x: number; y: number },
    normal: { x: number; y: number },
    radius: number,
): CentrelineEstimate {
    const normalLength = Math.sqrt(normal.x ** 2 + normal.y ** 2);

    if (normalLength === 0) {
        return {
            offset: 0,
            confidence: 0,
            samples: [],
        };
    }

    const nx = normal.x / normalLength;
    const ny = normal.y / normalLength;

    const samples: CrossSectionSample[] = [];

    for (let offset = -radius; offset <= radius; offset += 1) {
        const x = centre.x + nx * offset;
        const y = centre.y + ny * offset;

        samples.push({
            offset,
            darkness: sampleDarkness(image, Math.round(x), Math.round(y)),
        });
    }

    const totalDarkness = samples.reduce((sum, sample) => sum + sample.darkness, 0);

    if (totalDarkness === 0) {
        return {
            offset: 0,
            confidence: 0,
            samples,
        };
    }

    const weightedOffset =
        samples.reduce((sum, sample) => sum + sample.offset * sample.darkness, 0) / totalDarkness;

    const peak = Math.max(...samples.map((sample) => sample.darkness));

    return {
        offset: weightedOffset,
        confidence: peak,
        samples,
    };
}
