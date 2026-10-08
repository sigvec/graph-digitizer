import type { GroundTruthCurve } from '../groundTruth';
import { createLineGroundTruth } from '../groundTruth';

describe('ground truth curves', () => {
    it('evaluates a straight line', () => {
        const curve = createLineGroundTruth({ x: 10, y: 20 }, { x: 80, y: 60 });

        expect(curve.evaluate(0)).toEqual({
            x: 10,
            y: 20,
        });

        expect(curve.evaluate(0.5)).toEqual({
            x: 45,
            y: 40,
        });

        expect(curve.evaluate(1)).toEqual({
            x: 80,
            y: 60,
        });
    });

    it('calculates the line length', () => {
        const curve = createLineGroundTruth({ x: 10, y: 20 }, { x: 80, y: 60 });

        expect(curve.length).toBeCloseTo(Math.sqrt(70 * 70 + 40 * 40));
    });
});
