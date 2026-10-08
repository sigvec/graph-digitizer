import { CentrelineNavigationTracer } from '../CentrelineNavigationTracer';
import { renderParabola } from '../renderSyntheticCurve';
import { createParabolaGroundTruth } from '../groundTruth';
import { evaluateTrace } from '../metrics';

describe('centreline navigation clean curve baseline', () => {
    test('traces a clean parabola with no distractors', () => {
        const xStart = 10;
        const xEnd = 90;
        const vertexX = 50;
        const vertexY = 30;
        const curvature = 0.005;

        const image = renderParabola(100, 100, xStart, xEnd, vertexX, vertexY, curvature);

        const groundTruth = createParabolaGroundTruth(xStart, xEnd, vertexX, vertexY, curvature);

        const start = {
            x: xStart,
            y: vertexY + curvature * (xStart - vertexX) ** 2,
        };

        const direction = {
            x: 1,
            y: 2 * curvature * (xStart - vertexX),
        };

        const result = new CentrelineNavigationTracer().trace(image, start, direction, {
            stepSize: 1,
            searchRadius: 3,
            maxPoints: 100,
        });

        const evaluation = evaluateTrace(result.points, groundTruth);

        expect(result.points.length).toBeGreaterThan(1);
        expect(result.points.at(-1)!.x).toBeGreaterThan(70);
    });
});
