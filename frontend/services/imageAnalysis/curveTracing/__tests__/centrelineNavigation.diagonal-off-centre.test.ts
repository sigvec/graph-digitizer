import { CentrelineNavigationTracer } from '../CentrelineNavigationTracer';
import { SyntheticImage } from '../SyntheticImage';
import { createLineGroundTruth } from '../groundTruth';
import { evaluateTrace } from '../metrics';
import type { TracePixel } from '../image';
import type { TracePoint } from '../types';

const BLACK: TracePixel = { r: 0, g: 0, b: 0, a: 255 };

function renderThickLine(
    width: number,
    height: number,
    start: TracePoint,
    end: TracePoint,
    radius: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i += 1) {
        const t = steps === 0 ? 0 : i / steps;
        const x = Math.round(start.x + dx * t);
        const y = Math.round(start.y + dy * t);

        for (let oy = -radius; oy <= radius; oy += 1) {
            for (let ox = -radius; ox <= radius; ox += 1) {
                if (ox * ox + oy * oy <= radius * radius) {
                    image.setPixel(x + ox, y + oy, BLACK);
                }
            }
        }
    }

    return image;
}

describe('centreline navigation on a thick diagonal line', () => {
    test('recovers the centreline from a start two pixels off-centre', () => {
        const centreStart = { x: 12, y: 82 };
        const end = { x: 82, y: 12 };
        const image = renderThickLine(100, 100, centreStart, end, 2);
        const groundTruth = createLineGroundTruth(centreStart, end);

        // The line direction is (1, -1). Moving by (sqrt(2), sqrt(2))
        // offsets the start by exactly two pixels perpendicular to the line.
        const offset = Math.SQRT2;
        const traceStart = {
            x: centreStart.x + offset,
            y: centreStart.y + offset,
        };

        const result = new CentrelineNavigationTracer().trace(
            image,
            traceStart,
            { x: 1, y: -1 },
            {
                stepSize: 1,
                searchRadius: 3,
                maxPoints: 100,
            },
        );

        const evaluation = evaluateTrace(result.points, groundTruth);
        const endpoint = result.points[result.points.length - 1];

        console.log('OFF-CENTRE TRACE DIAGNOSTIC', {
            termination: result.termination,
            points: result.points,
            navigationPoints: result.navigationPoints,
            confidence: result.confidence,
        });

        expect(result.points.length).toBeGreaterThan(50);
        expect(evaluation.meanError).toBeLessThanOrEqual(1.5);
        expect(evaluation.maxInDomainError).toBeLessThanOrEqual(2.5);
        expect(endpoint.x).toBeGreaterThan(70);
        expect(endpoint.y).toBeLessThan(24);
        expect(result.termination).toBe('curve_end');
    });
});
