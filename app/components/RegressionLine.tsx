import React from 'react';

import Animated, {
    useAnimatedProps,
    SharedValue,
} from 'react-native-reanimated';

import { Path } from 'react-native-svg';

import {
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
} from '../constants/geometry';


import { Point } from '../types/geometry'
import { Calibration } from '../calibration/types'
import { LinearRegressionResult } from '../analysis/types'
import { CurveMode } from '../datasets/constants';
import { getRegressionPredictor, inverseTransformPoint } from '../calibration/transform'

const AnimatedPath = Animated.createAnimatedComponent(Path);

function regressionEndpoints(
    points: Point[],
    linearFit: LinearRegressionResult,
    calibration: Calibration
): [Point, Point] {


    let predictY = getRegressionPredictor(linearFit, calibration)

    const x0 = Math.min(...points.map(p => p.x));
    const x1 = Math.max(...points.map(p => p.x));

    const inverseTransformed0 = inverseTransformPoint({ x: x0, y: predictY(x0) }, calibration) || { x: 0, y: 0 }
    const inverseTransformed1 = inverseTransformPoint({ x: x1, y: predictY(x1) }, calibration) || { x: 0, y: 0 }

    return [
        inverseTransformed0,
        inverseTransformed1,
    ];

}


function generateSpline(points: Point[], segments = 20) {
    'worklet';
    if ((points?.length ?? 0) < 2) {
        return points;
    }

    const result = [];

    for (let i = 0; i < points.length - 1; i++) {

        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        for (let j = 0; j < segments; j++) {

            const t = j / segments;
            const t2 = t * t;
            const t3 = t2 * t;

            const x =
                0.5 * (
                    (2 * p1.x) +
                    (-p0.x + p2.x) * t +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
                );

            const y =
                0.5 * (
                    (2 * p1.y) +
                    (-p0.y + p2.y) * t +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
                );

            result.push({ x, y });
        }
    }

    result.push(points[points.length - 1]);

    return result;
}

function pointsToPath(points: Point[], imageWidth: number, imageHeight: number, curveMode: string) {
    'worklet';

    if ((points?.length ?? 0) < 2) {
        return '';
    }

    let curvePoints;

    switch (curveMode) {

        case CurveMode.NONE:
            return null;

        case CurveMode.LINEAR:
            curvePoints = points;
            break;

        case CurveMode.POINTS:
            curvePoints = generateSpline(points, 10);
            break;
        default:
            curvePoints = points;
    }

    return curvePoints.reduce((path, p, i) => {
        if (i === 0) {
            return `M${p.x * imageWidth / LOGICAL_WIDTH} ${p.y * imageHeight / LOGICAL_HEIGHT}`;
        }
        return `${path} L${p.x * imageWidth / LOGICAL_WIDTH} ${p.y * imageHeight / LOGICAL_HEIGHT}`;
    }, '');
}

interface Props {
    points: Point[];
    regression: LinearRegressionResult;
    calibration: Calibration;
    imageWidth: number;
    imageHeight: number;
    colour: string,
    scale: SharedValue<number>,
}

export function RegressionLine({
    points,
    regression,
    calibration,
    imageWidth,
    imageHeight,
    colour,
    scale,
}: Props) {

    if (!regression || regression.intercept == null || regression.slope == null) {
        return null;
    }

    const [p0, p1] = regressionEndpoints(points, regression, calibration);

    if (!p0.x || !p0.y || !p1.x || !p1.y) {
        return null;
    }


    const animatedProps = useAnimatedProps(() => {

        const d = pointsToPath([p0, p1], imageWidth, imageHeight, CurveMode.LINEAR);

        const strokeWidth = 3 / scale.value;
        const dash = 5 / scale.value;

        return {
            strokeWidth: strokeWidth,
            d: d ?? "",
            strokeDasharray: [dash, dash],
        };
    });

    return (
        <AnimatedPath
            animatedProps={animatedProps}
            stroke={colour}
            fill="none"
        />
    );

}