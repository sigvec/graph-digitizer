import type { Point } from '../types/geometry'
import type { Calibration } from '../calibration/types';
import { AxisScale } from './constants'
import { LinearRegressionResult } from '../analysis/types';

export function getRegressionPredictor(
    linearFit: LinearRegressionResult,
    calibration: Calibration
): (x: number) => number {

    if (calibration.x.scaleType === AxisScale.LINEAR) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return x => linearFit.slope * x + linearFit.intercept;
        } else {
            return x => 10 ** (linearFit.slope * x + linearFit.intercept);
        }
    }

    if (calibration.x.scaleType === AxisScale.LOG) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return x => linearFit.slope * Math.log10(x) + linearFit.intercept;
        } else {
            return x => (10 ** linearFit.intercept) * (x ** linearFit.slope);
        }
    }


    return x => linearFit.slope * x + linearFit.intercept;
}

export function transformPoint(point: Point, calibration: Calibration): Point | null {

    const { origin, x, y } = calibration;

    if (!origin || !x || !y) {
        return null;
    }

    const transformedX = transformAxis(
        point.x,
        x.p0 ?? origin.x,
        x.p1,
        x.value0,
        x.value1,
        x.scaleType
    );

    const transformedY = transformAxis(
        -point.y,
        -(y.p0 ?? origin.y),
        -y.p1,
        y.value0,
        y.value1,
        y.scaleType
    );

    if (transformedX == null || transformedY == null) {
        return null;
    }

    return {
        x: transformedX,
        y: transformedY,
    };
}

function transformAxis(
    p: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
    scaleType: AxisScale,
): number | null {

    if (
        !Number.isFinite(value0) ||
        !Number.isFinite(value1)
    ) {
        return null;
    }

    switch (scaleType) {

        case AxisScale.LOG:
            return transformLog(
                p,
                p0,
                p1,
                value0,
                value1
            );

        case AxisScale.LINEAR:
        default:
            return transformLinear(
                p,
                p0,
                p1,
                value0,
                value1
            );
    }
}

function transformLinear(
    p: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
): number | null {

    if (p0 === p1) {
        return null;
    }

    const fraction =
        (p - p0) /
        (p1 - p0);

    return value0 + fraction * (value1 - value0);
}

function transformLog(
    p: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
): number | null {

    if (p0 === p1) {
        return null;
    }

    if (value0 <= 0 || value1 <= 0) {
        return null;
    }

    const fraction =
        (p - p0) /
        (p1 - p0);

    const logV0 = Math.log10(value0);
    const logV1 = Math.log10(value1);

    const logValue = logV0 + fraction * (logV1 - logV0);

    return 10 ** logValue;
}

export function inverseTransformPoint(point: Point, calibration: Calibration): Point | null {

    const { origin, x, y } = calibration;

    if (!origin || !x || !y) {
        return null;
    }

    const transformedX = inverseTransformAxis(
        point.x,
        x.p0 ?? origin.x,
        x.p1,
        x.value0,
        x.value1,
        x.scaleType
    );

    const transformedY = inverseTransformAxis(
        point.y,
        (y.p0 ?? origin.y),
        y.p1,
        y.value0,
        y.value1,
        y.scaleType
    );

    if (transformedX == null || transformedY == null) {
        return null;
    }

    return {
        x: transformedX,
        y: transformedY,
    };
}

function inverseTransformAxis(
    value: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
    scaleType: AxisScale,
): number | null {

    if (
        !Number.isFinite(value0) ||
        !Number.isFinite(value1)
    ) {
        return null;
    }

    switch (scaleType) {

        case AxisScale.LOG:
            return inverseTransformLog(
                value,
                p0,
                p1,
                value0,
                value1
            );

        case AxisScale.LINEAR:
        default:
            return inverseTransformLinear(
                value,
                p0,
                p1,
                value0,
                value1
            );
    }
}

function inverseTransformLinear(
    value: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
): number | null {

    if (p0 === p1) {
        return null;
    }

    const fraction = (value - value0) / (value1 - value0);

    return p0 + fraction * (p1 - p0);
}

function inverseTransformLog(
    value: number,
    p0: number,
    p1: number,
    value0: number,
    value1: number,
): number | null {

    if (p0 === p1) {
        return null;
    }

    if (value0 <= 0 || value1 <= 0) {
        return null;
    }

    const logV0 = Math.log10(value0);
    const logV1 = Math.log10(value1);

    const fraction =
        (Math.log10(value) - logV0) /
        (logV1 - logV0);

    return p0 + fraction * (p1 - p0);
}