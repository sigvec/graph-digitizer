import type { GroundTruthCurve } from './groundTruth';
import type { TracePoint } from './types';

export interface TraceEvaluation {
    meanError: number;
    maxError: number;
    maxInDomainError: number;
    coverage: number;
    pointCount: number;
    pathLength: number;
    pathLengthRatio: number;
    backtracking: number;
}

export function distance(a: TracePoint, b: TracePoint): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    return Math.sqrt(dx * dx + dy * dy);
}

export interface TraceEvaluation {
    meanError: number;
    maxError: number;
    coverage: number;
    pointCount: number;
}

function nearestGroundTruthDistance(point: TracePoint, groundTruth: GroundTruthCurve): number {
    const samples = 1000;

    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const candidate = groundTruth.evaluate(t);

        bestDistance = Math.min(bestDistance, distance(point, candidate));
    }

    return bestDistance;
}

function buildGroundTruthSamples(
    groundTruth: GroundTruthCurve,
    sampleCount: number,
): Array<{
    t: number;
    point: TracePoint;
    distance: number;
}> {
    const samples = [];

    let accumulatedDistance = 0;
    let previousPoint = groundTruth.evaluate(0);

    samples.push({
        t: 0,
        point: previousPoint,
        distance: 0,
    });

    for (let i = 1; i <= sampleCount; i += 1) {
        const t = i / sampleCount;
        const point = groundTruth.evaluate(t);

        accumulatedDistance += distance(previousPoint, point);

        samples.push({
            t,
            point,
            distance: accumulatedDistance,
        });

        previousPoint = point;
    }

    return samples;
}

function calculatePathLength(points: TracePoint[]): number {
    let length = 0;

    for (let i = 1; i < points.length; i += 1) {
        length += distance(points[i - 1], points[i]);
    }

    return length;
}

function calculateBacktracking(points: TracePoint[], groundTruth: GroundTruthCurve): number {
    if (points.length < 2) {
        return 0;
    }

    const samples = buildGroundTruthSamples(groundTruth, 1000);

    const positions = points.map((point) => {
        let closestSample = samples[0];
        let closestDistance = distance(point, closestSample.point);

        for (const sample of samples) {
            const sampleDistance = distance(point, sample.point);

            if (sampleDistance < closestDistance) {
                closestDistance = sampleDistance;
                closestSample = sample;
            }
        }

        return closestSample.distance;
    });

    let backtracking = 0;

    for (let i = 1; i < positions.length; i += 1) {
        const delta = positions[i] - positions[i - 1];

        if (delta < 0) {
            backtracking += -delta;
        }
    }

    return backtracking;
}

export function evaluateTrace(
    points: TracePoint[],
    groundTruth: GroundTruthCurve,
): TraceEvaluation {
    if (points.length === 0) {
        return {
            meanError: 0,
            maxError: 0,
            maxInDomainError: 0,
            coverage: 0,
            pointCount: 0,
            pathLength: 0,
            pathLengthRatio: 0,
            backtracking: 0,
        };
    }

    const groundTruthSamples = buildGroundTruthSamples(groundTruth, 1000);

    const errors = points.map((point) => {
        let closestSample = groundTruthSamples[0];
        let closestDistance = distance(point, closestSample.point);

        for (const sample of groundTruthSamples) {
            const sampleDistance = distance(point, sample.point);

            if (sampleDistance < closestDistance) {
                closestDistance = sampleDistance;
                closestSample = sample;
            }
        }

        return {
            error: closestDistance,
            isInDomain: closestSample.t < 1,
        };
    });

    const totalError = errors.reduce((sum, entry) => sum + entry.error, 0);

    const meanError = totalError / errors.length;

    const maxError = Math.max(...errors.map((entry) => entry.error));

    const inDomainErrors = errors.filter((entry) => entry.isInDomain).map((entry) => entry.error);

    const maxInDomainError = inDomainErrors.length === 0 ? 0 : Math.max(...inDomainErrors);

    const tracedDistance = distance(points[0], points[points.length - 1]);

    const finalPoint = points[points.length - 1];

    let closestSample = groundTruthSamples[0];

    let closestDistance = distance(finalPoint, closestSample.point);

    for (const sample of groundTruthSamples) {
        const sampleDistance = distance(finalPoint, sample.point);

        if (sampleDistance < closestDistance) {
            closestDistance = sampleDistance;
            closestSample = sample;
        }
    }

    const totalGroundTruthLength = groundTruthSamples[groundTruthSamples.length - 1].distance;

    const coverage =
        totalGroundTruthLength === 0
            ? 0
            : Math.min(1, Math.max(0, closestSample.distance / totalGroundTruthLength));

    const pathLength = calculatePathLength(points);

    const pathLengthRatio =
        groundTruthSamples[groundTruthSamples.length - 1].distance === 0
            ? 0
            : pathLength / groundTruthSamples[groundTruthSamples.length - 1].distance;

    const backtracking = calculateBacktracking(points, groundTruth);

    return {
        meanError,
        maxError,
        maxInDomainError,
        coverage,
        pointCount: points.length,
        pathLength,
        pathLengthRatio,
        backtracking,
    };
}
