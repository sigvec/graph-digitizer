import { distance, evaluateTrace } from '../metrics';
import { createLineGroundTruth, type GroundTruthCurve } from '../groundTruth';

describe('distance', () => {
    it('calculates Euclidean distance', () => {
        expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });

    it('returns zero for identical points', () => {
        expect(distance({ x: 12, y: 34 }, { x: 12, y: 34 })).toBe(0);
    });
});

describe('evaluateTrace', () => {
    const groundTruth: GroundTruthCurve = {
        name: 'straight-line',
        evaluate(t) {
            return {
                x: 10 + 70 * t,
                y: 20 + 40 * t,
            };
        },
        length: Math.sqrt(70 ** 2 + 40 ** 2),
    };

    it('reports zero error for points on the ground-truth line', () => {
        const result = evaluateTrace(
            [
                { x: 10, y: 20 },
                { x: 45, y: 40 },
                { x: 80, y: 60 },
            ],
            groundTruth,
        );

        expect(result.meanError).toBeCloseTo(0);
        expect(result.maxError).toBeCloseTo(0);
        expect(result.pointCount).toBe(3);
    });

    it('reports geometric error for points away from the curve', () => {
        const result = evaluateTrace(
            [
                { x: 10, y: 25 },
                { x: 45, y: 45 },
                { x: 80, y: 65 },
            ],
            groundTruth,
        );

        expect(result.meanError).toBeGreaterThan(0);
        expect(result.maxError).toBeGreaterThan(0);
    });

    it('measures coverage along curved ground truth', () => {
        const radius = 40;

        const groundTruth: GroundTruthCurve = {
            name: 'quarter-circle',
            evaluate(t) {
                const angle = (Math.PI / 2) * t;

                return {
                    x: radius * Math.cos(angle),
                    y: radius * Math.sin(angle),
                };
            },
            length: (Math.PI / 2) * radius,
        };

        const result = evaluateTrace(
            [
                { x: radius, y: 0 },
                { x: 0, y: radius },
            ],
            groundTruth,
        );

        expect(result.coverage).toBeCloseTo(1, 2);
    });

    it('measures backtracking along the ground-truth curve', () => {
        const result = evaluateTrace(
            [
                { x: 10, y: 20 },
                { x: 30, y: 20 },
                { x: 20, y: 20 },
                { x: 40, y: 20 },
            ],
            {
                name: 'straight-line',
                evaluate(t) {
                    return {
                        x: 10 + 30 * t,
                        y: 20,
                    };
                },
                length: 30,
            },
        );

        expect(result.backtracking).toBeCloseTo(10, 1);
    });

    it('reports partial coverage when a trace stops halfway along the curve', () => {
        const groundTruth = createLineGroundTruth({ x: 0, y: 0 }, { x: 100, y: 0 });

        const trace = [
            { x: 0, y: 0 },
            { x: 25, y: 0 },
            { x: 50, y: 0 },
        ];

        const evaluation = evaluateTrace(trace, groundTruth);

        expect(evaluation.coverage).toBeCloseTo(0.5, 1);
    });

    it('separates endpoint overshoot from in-domain tracing error', () => {
        const groundTruth = createLineGroundTruth({ x: 0, y: 0 }, { x: 10, y: 0 });

        const trace = [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
            { x: 10, y: 0 },
            { x: 15, y: 0 },
        ];

        const evaluation = evaluateTrace(trace, groundTruth);

        expect(evaluation.maxError).toBe(5);
        expect(evaluation.maxInDomainError).toBe(0);
    });
});
