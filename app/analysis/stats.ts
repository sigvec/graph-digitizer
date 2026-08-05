import { transformPoint } from '../calibration/transform';
import { Point } from '../types/geometry';
import type { Calibration } from '../calibration/types';

export function computeStats(points: Point[], calibration: Calibration) {
    if (!points.length) return null;

    const transformed =
        points.map((p) => transformPoint(p, calibration)).filter((item) => item != null) || [];
    const xs = transformed.map((p) => p?.x);
    const ys = transformed.map((p) => p?.y);

    return {
        count: points.length,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
    };
}
