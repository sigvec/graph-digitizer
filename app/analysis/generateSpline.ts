import type { Coords } from './types';

const DEFAULT_SEGMENTS = 20;

export function generateSpline(points: Coords[], segments = DEFAULT_SEGMENTS): Coords[] {
    'worklet';
    if (points.length < 2) {
        return points;
    }

    const result: Coords[] = [];

    // Catmull-Rom spline interpolation.
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        for (let j = 0; j < segments; j++) {
            const t = j / segments;
            const t2 = t * t;
            const t3 = t2 * t;

            const x =
                0.5 *
                (2 * p1.x +
                    (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

            const y =
                0.5 *
                (2 * p1.y +
                    (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

            result.push({ x, y });
        }
    }

    result.push(points[points.length - 1]);

    return result;
}
