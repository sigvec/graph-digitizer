import { AxisScale } from '../calibration/constants';

export interface axisCalibration {
    scaleType: AxisScale;
    p0: number | null;
    p1: number;
    value0: number;
    value1: number;
    units: string;
}

export interface Calibration {
    origin: { x: number; y: number };
    x: axisCalibration;
    y: axisCalibration;
}
