import { AxisScale } from '../calibration/constants';

export interface AxisCalibration {
    scaleType: AxisScale;
    p0: number | null;
    p1: number;
    value0: number;
    value1: number;
    units: string;
}

export interface Calibration {
    origin: { x: number; y: number };
    x: AxisCalibration;
    y: AxisCalibration;
}

export type CalibrationAxis = 'x' | 'y';

export type NumericCalibrationKey = 'p0' | 'p1' | 'value0' | 'value1';

export type CalibrationSelection = 'origin' | 'x0' | 'x1' | 'y0' | 'y1';
