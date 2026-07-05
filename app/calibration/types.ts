import { AxisScale } from "../calibration/constants";
import { Point } from "../types/geometry";

export interface axisCalibration {
    scaleType: AxisScale;
    p0: number | null;
    p1: number;
    value0: number;
    value1: number;
    units: string;
}

export interface Calibration {
    origin: Point;
    x: axisCalibration;
    y: axisCalibration;
}