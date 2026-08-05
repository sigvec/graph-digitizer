import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    runOnJS,
    useSharedValue,
    SharedValue,
} from 'react-native-reanimated';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';
import type { Point, InteractionMode } from '../../types/geometry';
import { Coords } from '../../analysis/types';

interface DraggablePointProps {
    item: Point;
    pointIndex: number;
    datasetIndex: number;
    mode: InteractionMode;
    colour: string;
    isSelected: boolean;
    datasetId: string;
    datasetIsActive: boolean;
    datasetIsLocked: boolean;
    scale: SharedValue<number>;
    imageWidth: number;
    imageHeight: number;
    sharedDatasetPoints: SharedValue<Coords[][]>;
    onDragComplete: (id: string, x: number, y: number) => void;
    setSelectedPointRef: React.Dispatch<
        React.SetStateAction<{
            datasetId: string;
            pointId: string;
        } | null>
    >;
}

export function DraggablePoint({
    item,
    pointIndex,
    datasetIndex,
    mode,
    colour,
    isSelected,
    datasetId,
    datasetIsActive,
    datasetIsLocked,
    scale,
    imageWidth,
    imageHeight,
    sharedDatasetPoints,
    onDragComplete,
    setSelectedPointRef,
}: DraggablePointProps) {
    // Use starting positions directly as initial shared values
    const translateX = useSharedValue(item.x);
    const translateY = useSharedValue(item.y);

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 50;

    const isEnabled = !datasetIsLocked && datasetIsActive && mode === 'points';
    const panGesture = Gesture.Pan()
        .enabled(isEnabled)
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            contextX.value = translateX.value;
            contextY.value = translateY.value;

            runOnJS(setSelectedPointRef)({
                datasetId: datasetId,
                pointId: item.id,
            });
        })
        .onUpdate((event) => {
            translateX.value =
                contextX.value + (event.translationX * LOGICAL_WIDTH) / imageWidth / scale.value;
            translateY.value =
                contextY.value + (event.translationY * LOGICAL_HEIGHT) / imageHeight / scale.value;

            sharedDatasetPoints.modify((value) => {
                value[datasetIndex][pointIndex] = {
                    x: translateX.value,
                    y: translateY.value,
                };
                return value;
            });
        })
        .onEnd(() => {
            runOnJS(onDragComplete)(item.id, translateX.value, translateY.value);
        });

    const RADIUS = 40;

    const containerStyle = {
        position: 'absolute' as const,
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderRadius: RADIUS,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        marginLeft: -RADIUS,
        marginTop: -RADIUS,
        opacity: mode !== 'points' ? 0.4 : datasetIsLocked ? 0.8 : 1,
    };

    const ring = {
        position: 'absolute' as const,
        borderRadius: 999,
    };

    const coreDot = {
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        backgroundColor: colour,
        zIndex: 1,
    };

    const innerRing = {
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderWidth: isSelected ? 28 : 18,
        backgroundColor: '#00000000',
        borderColor: 'white',
        zIndex: 2,
    };

    const outerRing = {
        width: 2 * RADIUS,
        height: 2 * RADIUS,
        borderWidth: 6,
        backgroundColor: '#00000000',
        borderColor: 'black',
        zIndex: 3,
    };

    const animatedProps = useAnimatedStyle(() => ({
        transform: [
            { translateX: (translateX.value * imageWidth) / LOGICAL_WIDTH },
            { translateY: (translateY.value * imageHeight) / LOGICAL_HEIGHT },
            { scale: 0.1 / scale.value },
        ],
    }));

    const cursorHorProps = useAnimatedStyle(() => ({
        position: 'absolute',
        left: 0,
        top: (translateY.value * imageHeight) / LOGICAL_HEIGHT - 1 / scale.value,
        width: imageWidth,
        height: 2 / scale.value,
        backgroundColor: '#535353',
        opacity: 0.2,
    }));

    const cursorVerProps = useAnimatedStyle(() => ({
        position: 'absolute',
        left: (translateX.value * imageWidth) / LOGICAL_HEIGHT - 1 / scale.value,
        top: 0,
        width: 2 / scale.value,
        height: imageHeight,
        backgroundColor: '#535353',
        opacity: 0.2,
    }));

    useEffect(() => {
        // If the parent state changes externally, sync the shared values
        translateX.value = item.x;
        translateY.value = item.y;
    }, [item.x, item.y, translateX, translateY]);

    return (
        <>
            {isSelected && (
                <>
                    {/* Horizontal line */}
                    <Animated.View style={[cursorHorProps]} />

                    {/* Vertical line */}
                    <Animated.View style={[cursorVerProps]} />
                </>
            )}

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[containerStyle, animatedProps]}>
                    <View style={[ring, coreDot]} />

                    {datasetIsActive && (
                        <>
                            <View style={[ring, innerRing]} />
                            <View style={[ring, outerRing]} />
                        </>
                    )}
                </Animated.View>
            </GestureDetector>
        </>
    );
}
