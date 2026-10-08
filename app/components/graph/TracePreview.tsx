import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { Point } from '../../types/geometry';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';

interface Props {
    points: Point[];
    start: Point | null;
    imageWidth: number;
    imageHeight: number;
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

export default function TracePreview({ points, start, imageWidth, imageHeight }: Props) {
    const path = createPath(points, imageWidth, imageHeight);

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
            {path ? <Path d={path} stroke="#ff3366" strokeWidth={6} fill="none" /> : null}
            {start ? (
                <Circle
                    cx={(start.x * imageWidth) / LOGICAL_WIDTH}
                    cy={(start.y * imageHeight) / LOGICAL_HEIGHT}
                    r={15}
                    fill="#ff3366"
                />
            ) : null}
        </Svg>
    );
}
