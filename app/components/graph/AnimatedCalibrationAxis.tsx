import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    runOnJS,
    useSharedValue,
    SharedValue,
} from 'react-native-reanimated';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';
import { Axis } from '../../calibration/constants';
import type { InteractionMode } from '../../types/geometry';
import type { CalibrationSelection } from '../../calibration/types';
import type { SharedCalibrationPoints } from './DraggableCalibrationPoint';

interface AnimatedCalibrationAxisProps {
    sharedCalibrationPoints: SharedValue<SharedCalibrationPoints>;
    calibrationAxis: 'X' | 'Y';
    mode: InteractionMode;
    colour: string;
    scale: SharedValue<number>;
    imageWidth: number;
    imageHeight: number;
    onDragComplete: (calibrationType: CalibrationSelection, x: number, y: number) => void;
}

export function AnimatedCalibrationAxis({
    sharedCalibrationPoints,
    calibrationAxis,
    mode,
    colour,
    scale,
    imageWidth,
    imageHeight,
    onDragComplete,
}: AnimatedCalibrationAxisProps) {
    const calibrationEnabled = mode === 'calibration';

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 5;

    const calibrationPoint = 'origin';

    const panGesture = Gesture.Pan()
        .enabled(calibrationEnabled)
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            contextX.value = sharedCalibrationPoints.value[calibrationPoint].x;
            contextY.value = sharedCalibrationPoints.value[calibrationPoint].y;
        })
        .onUpdate((event) => {
            const c = {
                ...sharedCalibrationPoints.value,
            };

            if (calibrationAxis === Axis.X) {
                const translateY =
                    contextY.value +
                    (event.translationY * LOGICAL_HEIGHT) / imageHeight / scale.value;
                c[calibrationPoint] = {
                    ...c[calibrationPoint],
                    y: translateY,
                };
            } else {
                const translateX =
                    contextX.value +
                    (event.translationX * LOGICAL_WIDTH) / imageWidth / scale.value;
                c[calibrationPoint] = {
                    ...c[calibrationPoint],
                    x: translateX,
                };
            }

            sharedCalibrationPoints.value = c;
        })
        .onEnd(() => {
            runOnJS(onDragComplete)(
                calibrationPoint,
                sharedCalibrationPoints.value[calibrationPoint].x,
                sharedCalibrationPoints.value[calibrationPoint].y,
            );
        });

    const animatedStyleContainer = useAnimatedStyle(() => {
        const strokeWidth = 4 / scale.value;
        const c = sharedCalibrationPoints.value;
        const X0 =
            calibrationAxis === 'X'
                ? 0
                : (c[calibrationPoint].x * imageWidth) / LOGICAL_WIDTH - 2 * strokeWidth;
        const X1 =
            calibrationAxis === 'X'
                ? imageWidth
                : (c[calibrationPoint].x * imageWidth) / LOGICAL_WIDTH + 2 * strokeWidth;
        const Y0 =
            calibrationAxis === 'X'
                ? (c[calibrationPoint].y * imageHeight) / LOGICAL_HEIGHT - 2 * strokeWidth
                : 0;
        const Y1 =
            calibrationAxis === 'X'
                ? (c[calibrationPoint].y * imageHeight) / LOGICAL_HEIGHT + 2 * strokeWidth
                : imageHeight;

        return {
            position: 'absolute',
            left: X0,
            top: Y0,
            width: X1 - X0,
            height: Y1 - Y0,
            backgroundColor: '#00000000',
        };
    });

    const lineStyle = {
        position: 'absolute' as const,
        left: calibrationAxis === 'X' ? ('0%' as const) : ('37.5%' as const),
        top: calibrationAxis === 'X' ? ('37.5%' as const) : ('0%' as const),
        width: calibrationAxis === 'X' ? ('100%' as const) : ('25%' as const),
        height: calibrationAxis === 'X' ? ('25%' as const) : ('100%' as const),
        backgroundColor: colour,
    };

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={animatedStyleContainer}>
                <View style={lineStyle} />
            </Animated.View>
        </GestureDetector>
    );
}
