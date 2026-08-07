import React from 'react';
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated';
import { Path, PathProps } from 'react-native-svg';
import type { CurveMode } from '../../datasets/constants';
import { pointsToPath } from '../../analysis/pointsToPath';
import type { Dataset } from '../../datasets/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedDatasetPathProps {
    datasetIndex: number;
    sharedDatasets: SharedValue<Dataset[]>;
    imageWidth: number;
    imageHeight: number;
    curveMode: CurveMode;
    colour: string;
    scale: SharedValue<number>;
}

export function AnimatedDatasetPath({
    datasetIndex,
    sharedDatasets,
    imageWidth,
    imageHeight,
    curveMode,
    colour,
    scale,
}: AnimatedDatasetPathProps) {
    const animatedProps = useAnimatedProps<PathProps>(() => {
        const points = sharedDatasets.value[datasetIndex].points;
        if (!points || points.length < 2) {
            return { d: '' };
        }

        const d = pointsToPath(points, imageWidth, imageHeight, curveMode) ?? undefined;

        return {
            strokeWidth: 3 / scale.value,
            d: d,
        };
    });

    return <AnimatedPath animatedProps={animatedProps} stroke={colour} fill="none" />;
}
