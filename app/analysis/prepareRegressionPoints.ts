import { Point } from '../types/geometry'
import { Calibration } from "../calibration/types";
import { AxisScale } from "../calibration/constants";

export function prepareRegressionPoints(
    points: Point[],
    calibration: Calibration
): Point[] {
    return points.map(p => ({

        x:
            calibration.x.scaleType === AxisScale.LOG
                ? Math.log10(p.x)
                : p.x,

        y:
            calibration.y.scaleType === AxisScale.LOG
                ? Math.log10(p.y)
                : p.y,

    }));
}