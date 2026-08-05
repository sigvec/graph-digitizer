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
import type { InteractionMode } from '../../types/geometry';
import type { CalibrationSelection } from '../../calibration/types';

export interface SharedCalibrationPoints {
    origin: { x: number; y: number };

    x0: { x: number | null; y: null };
    x1: { x: number; y: null };

    y0: { x: null; y: number | null };
    y1: { x: null; y: number };
}

interface DraggableCalibrationPointProps {
    calibrationType: CalibrationSelection;
    mode: InteractionMode;
    colour: string;
    scale: SharedValue<number>;
    imageWidth: number;
    imageHeight: number;
    sharedCalibrationPoints: SharedValue<SharedCalibrationPoints>;
    onDragComplete: (calibrationType: CalibrationSelection, x: number, y: number) => void;
}

export function DraggableCalibrationPoint({
    calibrationType,
    mode,
    colour,
    scale,
    imageWidth,
    imageHeight,
    sharedCalibrationPoints,
    onDragComplete,
}: DraggableCalibrationPointProps) {
    const calibrationEnabled = mode === 'calibration';

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 50;

    const panGesture = Gesture.Pan()
        .enabled(calibrationEnabled)
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            contextX.value = sharedCalibrationPoints.value[calibrationType].x ?? 0;
            contextY.value = sharedCalibrationPoints.value[calibrationType].y ?? 0;
        })
        .onUpdate((event) => {
            let translateX;
            let translateY;

            if (
                calibrationType === 'origin' ||
                calibrationType === 'x0' ||
                calibrationType === 'x1'
            ) {
                translateX =
                    contextX.value +
                    (event.translationX * LOGICAL_WIDTH) / imageWidth / scale.value;
            } else {
                translateX = sharedCalibrationPoints.value.origin.x;
            }
            if (
                calibrationType === 'origin' ||
                calibrationType === 'y0' ||
                calibrationType === 'y1'
            ) {
                translateY =
                    contextY.value +
                    (event.translationY * LOGICAL_HEIGHT) / imageHeight / scale.value;
            } else {
                translateY = contextY.value;
            }

            const c = {
                ...sharedCalibrationPoints.value,
            };

            switch (calibrationType) {
                case 'origin':
                    c[calibrationType] = {
                        ...c[calibrationType],
                        x: translateX,
                        y: translateY,
                    };
                    break;
                case 'x0':
                    c[calibrationType] = {
                        ...c[calibrationType],
                        x: translateX,
                        y: null,
                    };
                    break;
                case 'x1':
                    c[calibrationType] = {
                        ...c[calibrationType],
                        x: translateX,
                        y: null,
                    };
                    break;
                case 'y0':
                    c[calibrationType] = {
                        ...c[calibrationType],
                        x: null,
                        y: translateY,
                    };
                    break;
                case 'y1':
                    c[calibrationType] = {
                        ...c[calibrationType],
                        x: null,
                        y: translateY,
                    };
                    break;
            }

            sharedCalibrationPoints.value = c;
        })
        .onEnd(() => {
            runOnJS(onDragComplete)(
                calibrationType,
                sharedCalibrationPoints.value[calibrationType].x ?? 0,
                sharedCalibrationPoints.value[calibrationType].y ?? 0,
            );
        });

    const RADIUS = 60;

    const containerStyle = {
        position: 'absolute' as const,
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderRadius: RADIUS,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginLeft: -RADIUS,
        marginTop: -RADIUS,
    };

    const coreDot = {
        position: 'absolute' as const,
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderRadius: RADIUS,
        backgroundColor: colour,
        zIndex: 2,
    };

    const outerRing = {
        position: 'absolute' as const,
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderRadius: 1.5 * RADIUS,
        borderWidth: 15,
        backgroundColor: '#00000000',
        borderColor: 'white',
        zIndex: 3,
    };

    const boundaryRing = {
        position: 'absolute' as const,
        width: 2.2 * RADIUS,
        height: 2.2 * RADIUS,
        borderRadius: 1.5 * RADIUS,
        borderWidth: 35,
        backgroundColor: 'black',
        borderColor: 'black',
        zIndex: 1,
    };

    const animatedProps = useAnimatedStyle(() => {
        let translateX: number;
        let translateY: number;

        if (calibrationType === 'origin' || calibrationType === 'x0' || calibrationType === 'x1') {
            translateX = sharedCalibrationPoints.value[calibrationType].x ?? 0;
        } else {
            translateX = sharedCalibrationPoints.value.origin.x;
        }
        if (calibrationType === 'origin' || calibrationType === 'y0' || calibrationType === 'y1') {
            translateY = sharedCalibrationPoints.value[calibrationType].y ?? 0;
        } else {
            translateY = sharedCalibrationPoints.value.origin.y;
        }

        const hide =
            (calibrationType === 'x0' && sharedCalibrationPoints.value.x0.x === null) ||
            (calibrationType === 'y0' && sharedCalibrationPoints.value.y0.y === null);

        return {
            transform: [
                { translateX: (translateX * imageWidth) / LOGICAL_WIDTH },
                { translateY: (translateY * imageHeight) / LOGICAL_HEIGHT },
                { scale: 0.1 / scale.value },
            ],
            opacity: hide ? 0 : 1,
        };
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[containerStyle, animatedProps]}>
                <View style={[coreDot]} />
                {mode === 'calibration' && (
                    <>
                        <View style={[outerRing]} />
                        <View style={[boundaryRing]} />
                    </>
                )}
            </Animated.View>
        </GestureDetector>
    );
}
