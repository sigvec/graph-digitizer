import React from 'react';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Point } from '../../types/geometry';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
    points: Point[];
    start: Point | null;
    imageWidth: number;
    imageHeight: number;
    scale: SharedValue<number>;
}

function createPath(points: Point[], imageWidth: number, imageHeight: number) {
    if (points.length < 2) {
        return '';
    }

    return points
        .map((point, index) => {
            const x = (point.x * imageWidth) / LOGICAL_WIDTH;
            const y = (point.y * imageHeight) / LOGICAL_HEIGHT;
            return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
        })
        .join(' ');
}

export default function TracePreview({ points, start, imageWidth, imageHeight, scale }: Props) {
    const path = createPath(points, imageWidth, imageHeight);

    // Trace overlays are children of the zoomed image. Inverse-scale their
    // stroke and marker radius to keep their rendered size constant on screen.
    const pathAnimatedProps = useAnimatedProps(() => ({
        strokeWidth: 3 / Math.max(scale.value, 0.001),
    }));
    const startAnimatedProps = useAnimatedProps(() => ({
        r: 5 / Math.max(scale.value, 0.001),
    }));

    return (
        <Svg
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: imageWidth,
                height: imageHeight,
            }}
        >
            {path ? (
                <AnimatedPath
                    animatedProps={pathAnimatedProps}
                    d={path}
                    stroke="#ff3366"
                    fill="none"
                />
            ) : null}
            {start ? (
                <AnimatedCircle
                    animatedProps={startAnimatedProps}
                    cx={(start.x * imageWidth) / LOGICAL_WIDTH}
                    cy={(start.y * imageHeight) / LOGICAL_HEIGHT}
                    fill="#ff3366"
                />
            ) : null}
        </Svg>
    );
}
