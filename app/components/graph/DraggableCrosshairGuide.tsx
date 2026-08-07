import React from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    runOnJS,
    useSharedValue,
    SharedValue,
} from 'react-native-reanimated';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';
import type { Point, SelectedPointRef } from '../../types/geometry';
import type { Dataset } from '../../datasets/types';

interface DraggableCrosshairGuideProps {
    axis: 'x' | 'y';
    isEnabled: boolean;
    scale: SharedValue<number>;
    imageWidth: number;
    imageHeight: number;
    sharedDatasets: SharedValue<Dataset[]>;
    onDragComplete: (id: string, x: number, y: number) => void;
    selectedPointRef: SelectedPointRef | null;
}

export function DraggableCrosshairGuide({
    axis,
    isEnabled,
    scale,
    imageWidth,
    imageHeight,
    sharedDatasets,
    onDragComplete,
    selectedPointRef,
}: DraggableCrosshairGuideProps) {
    // ---------------------------------------------------------------------
    // Worklet helpers
    // ---------------------------------------------------------------------
    function findSharedPoint(
        datasets: Dataset[],
        selectedPointRef: SelectedPointRef | null,
    ): Point | undefined {
        'worklet';

        const sharedDataset = datasets.find((d) => d.id === selectedPointRef?.datasetId);
        return sharedDataset?.points.find((p) => p.id === selectedPointRef?.pointId);
    }

    // ---------------------------------------------------------------------
    // Shared values
    // ---------------------------------------------------------------------
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);

    const startX = useSharedValue(0);
    const startY = useSharedValue(0);

    // ---------------------------------------------------------------------
    // Gestures
    // ---------------------------------------------------------------------
    const SLOP = 30;

    const panGesture = Gesture.Pan()
        .enabled(isEnabled)
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            const datasets = sharedDatasets.value;
            const sharedPoint = findSharedPoint(datasets, selectedPointRef);
            const pointX = sharedPoint?.x ?? 0;
            const pointY = sharedPoint?.y ?? 0;

            startX.value = pointX;
            startY.value = pointY;

            dragX.value = pointX;
            dragY.value = pointY;
        })
        .onUpdate((event) => {
            if (axis === 'x') {
                dragY.value =
                    startY.value +
                    (event.translationY * LOGICAL_HEIGHT) / imageHeight / scale.value;
            } else if (axis === 'y') {
                dragX.value =
                    startX.value + (event.translationX * LOGICAL_WIDTH) / imageWidth / scale.value;
            }

            sharedDatasets.modify((value) => {
                if (selectedPointRef === null) {
                    return value;
                }
                const dataset = value.find((d) => d.id === selectedPointRef?.datasetId);

                if (!dataset) {
                    return value;
                }

                const point = dataset.points.find((p) => p.id === selectedPointRef?.pointId);

                if (!point) {
                    return value;
                }

                point.y = dragY.value;
                point.x = dragX.value;
                return value;
            });
        })
        .onEnd(() => {
            if (selectedPointRef?.pointId !== undefined) {
                runOnJS(onDragComplete)(selectedPointRef?.pointId, dragX.value, dragY.value);
            }
        });

    // ---------------------------------------------------------------------
    // Animated styles
    // ---------------------------------------------------------------------
    const guideAnimatedStyle = useAnimatedStyle(() => {
        const datasets = sharedDatasets.value;
        const sharedPoint = findSharedPoint(datasets, selectedPointRef);

        const offsetX = axis === 'x' ? 0 : (sharedPoint?.x ?? 0);
        const offsetY = axis === 'y' ? 0 : (sharedPoint?.y ?? 0);
        return {
            transform: [
                { translateX: (offsetX * imageWidth) / LOGICAL_WIDTH },
                { translateY: (offsetY * imageHeight) / LOGICAL_HEIGHT },
            ],
        };
    });

    const cursorPropsX = useAnimatedStyle(() => ({
        position: 'absolute',
        left: 0,
        top: -1 / scale.value,
        width: imageWidth,
        height: 2 / scale.value,
        backgroundColor: '#535353',
        opacity: 0.5,
    }));

    const cursorPropsY = useAnimatedStyle(() => ({
        position: 'absolute',
        left: -1 / scale.value,
        top: 0,
        width: 2 / scale.value,
        height: imageHeight,
        backgroundColor: '#535353',
        opacity: 0.5,
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    guideAnimatedStyle,
                    axis === 'x' && cursorPropsX,
                    axis === 'y' && cursorPropsY,
                ]}
            />
        </GestureDetector>
    );
}
