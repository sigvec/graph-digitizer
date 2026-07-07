import type { Point } from '../types/geometry'
import type { LinearRegressionResult, Predictor } from './types';

export function linearRegression(points: Point[]): LinearRegressionResult | null {
    if (points.length < 2) return null;

    let n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    points.forEach(p => {
        sumX += p.x;
        sumY += p.y;
        sumXY += p.x * p.y;
        sumXX += p.x * p.x;
    });

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}

export function computeR2(points: Point[], predictY: Predictor): number | null {
    if (points.length < 2) return null;

    const meanY =
        points.reduce((sum, p) => sum + p.y, 0) / points.length;

    let ssTot = 0;
    let ssRes = 0;

    points.forEach(p => {
        const yHat = predictY(p.x);
        ssTot += (p.y - meanY) ** 2;
        ssRes += (p.y - yHat) ** 2;
    });

    if (ssTot === 0) return null;

    return 1 - ssRes / ssTot;
}