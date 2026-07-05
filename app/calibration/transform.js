import { AxisScale } from './constants'

export function transformPoint(point, calibration) {

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
    p,
    p0,
    p1,
    value0,
    value1,
    scaleType,
) {

    if (
        p0 == null ||
        p1 == null ||
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
    p,
    p0,
    p1,
    value0,
    value1,
) {

    if (p0 === p1) {
        return null;
    }

    const fraction =
        (p - p0) /
        (p1 - p0);

    return value0 + fraction * (value1 - value0);
}

function transformLog(
    p,
    p0,
    p1,
    value0,
    value1,
) {

    if (p0 === p1) {
        return null;
    }

    if (value0 <= 0 || value1 <= 0) {
        return null;
    }

    const fraction =
        (p - p0) /
        (p1 - p0);

    const logValue =
        Math.log10(value0) +
        fraction *
        (Math.log10(value1) - Math.log10(value0));

    return 10 ** logValue;
}