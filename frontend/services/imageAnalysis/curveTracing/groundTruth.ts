import type { TracePoint } from './types';

export interface GroundTruthCurve {
    name: string;
    evaluate(t: number): TracePoint;
    length: number;
}

export function createLineGroundTruth(start: TracePoint, end: TracePoint): GroundTruthCurve {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    return {
        name: 'straight-line',
        evaluate(t) {
            return {
                x: start.x + dx * t,
                y: start.y + dy * t,
            };
        },
        length: Math.sqrt(dx * dx + dy * dy),
    };
}

export function createParabolaGroundTruth(
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
): GroundTruthCurve {
    const dx = xEnd - xStart;

    const evaluate = (t: number): TracePoint => {
        const x = xStart + dx * t;
        const offset = x - vertexX;

        return {
            x,
            y: vertexY + curvature * offset * offset,
        };
    };

    const samples = 1000;
    let length = 0;
    let previousPoint = evaluate(0);

    for (let i = 1; i <= samples; i += 1) {
        const t = i / samples;
        const point = evaluate(t);

        length += Math.sqrt((point.x - previousPoint.x) ** 2 + (point.y - previousPoint.y) ** 2);

        previousPoint = point;
    }

    return {
        name: 'parabola',
        evaluate,
        length,
    };
}

export function createSharpBendGroundTruth(
    xStart: number,
    bendX: number,
    bendY: number,
    yEnd: number,
): GroundTruthCurve {
    const horizontalLength = bendX - xStart;
    const verticalLength = yEnd - bendY;
    const totalLength = horizontalLength + verticalLength;

    return {
        name: 'sharp-bend',
        evaluate(t) {
            const distance = t * totalLength;

            if (distance <= horizontalLength) {
                return {
                    x: xStart + distance,
                    y: bendY - (bendX - (xStart + distance)),
                };
            }

            return {
                x: bendX,
                y: bendY + (distance - horizontalLength),
            };
        },
        length: totalLength,
    };
}
