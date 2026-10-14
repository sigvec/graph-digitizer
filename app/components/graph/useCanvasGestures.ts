import React from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, SharedValue } from 'react-native-reanimated';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';

interface CanvasGesturesProps {
    addPoint: (x: number, y: number) => void;
    onTap?: (x: number, y: number) => void;
    scale: SharedValue<number>;
    translateX: SharedValue<number>;
    translateY: SharedValue<number>;
    savedScale: SharedValue<number>;
    savedTranslateX: SharedValue<number>;
    savedTranslateY: SharedValue<number>;
    displaySize: {
        width: number;
        height: number;
    };
    imageWidth: number | null;
    imageHeight: number | null;
    setZoomDisplay: React.Dispatch<React.SetStateAction<number>>;
    setTranslation: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export function useCanvasGestures({
    addPoint,
    onTap,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    displaySize,
    imageWidth,
    imageHeight,
    setZoomDisplay,
    setTranslation,
}: CanvasGesturesProps) {
    // Dynamic values to anchor the exact scaling focal point
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);
    const fitScale = Math.min(
        displaySize.width / (imageWidth ?? 1),
        displaySize.height / (imageHeight ?? 1),
    );
    const maxScale = fitScale * 10;
    const minScale = fitScale * 0.5;

    // Pan translation is cumulative for the lifetime of the gesture. Rebase it
    // whenever the pointer count changes so lifting one finger after a pinch
    // cannot apply movement accumulated while two fingers were down.
    const panTranslationStartX = useSharedValue(0);
    const panTranslationStartY = useSharedValue(0);
    const panBaseTranslateX = useSharedValue(0);
    const panBaseTranslateY = useSharedValue(0);
    const panLastPointerCount = useSharedValue(0);

    const pan = Gesture.Pan()
        .onStart((e) => {
            panTranslationStartX.value = e.translationX;
            panTranslationStartY.value = e.translationY;
            panBaseTranslateX.value = translateX.value;
            panBaseTranslateY.value = translateY.value;
            panLastPointerCount.value = e.numberOfPointers;
        })
        .onUpdate((e) => {
            const pointerCount = e.numberOfPointers;

            if (pointerCount !== panLastPointerCount.value) {
                // Keep the current visual position and begin a fresh pan delta.
                panLastPointerCount.value = pointerCount;
                panTranslationStartX.value = e.translationX;
                panTranslationStartY.value = e.translationY;
                panBaseTranslateX.value = translateX.value;
                panBaseTranslateY.value = translateY.value;
            }

            if (pointerCount !== 1) return;

            translateX.value =
                panBaseTranslateX.value + e.translationX - panTranslationStartX.value;
            translateY.value =
                panBaseTranslateY.value + e.translationY - panTranslationStartY.value;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            runOnJS(setTranslation)({ x: savedTranslateX.value, y: savedTranslateY.value });
        });
    const pinch = Gesture.Pinch()
        .onStart((e) => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            // 1. Establish the anchor origin relative to the top-left of the box
            // Subtract previous shifts so the coordinate locks onto the actual content
            const centeredFocalX = e.focalX - displaySize.width / 2;
            const centeredFocalY = e.focalY - displaySize.height / 2;

            focalX.value = (centeredFocalX - savedTranslateX.value) / savedScale.value;

            focalY.value = (centeredFocalY - savedTranslateY.value) / savedScale.value;
        })
        .onUpdate((e) => {
            if (e.numberOfPointers < 2) return;

            const newScale = Math.max(minScale, Math.min(maxScale, savedScale.value * e.scale));
            scale.value = newScale;

            // 2. Calculate the difference between the starting scale and current scale
            const scaleRatio = newScale / savedScale.value;

            // 3. Adjust the layout translation cleanly based on the locked anchor point
            translateX.value =
                savedTranslateX.value + savedScale.value * (focalX.value * (1 - scaleRatio));
            translateY.value =
                savedTranslateY.value + savedScale.value * (focalY.value * (1 - scaleRatio));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;

            runOnJS(setZoomDisplay)(scale.value / fitScale);
            runOnJS(setTranslation)({ x: savedTranslateX.value, y: savedTranslateY.value });
        });
    const tap = Gesture.Tap()
        .maxDistance(6)
        .maxDuration(250)
        .onEnd((e) => {
            const centeredX = e.x - displaySize.width / 2;
            const centeredY = e.y - displaySize.height / 2;

            const x =
                (((centeredX - translateX.value) / scale.value) * LOGICAL_WIDTH) /
                    (imageWidth ?? 1) +
                LOGICAL_WIDTH / 2;

            const y =
                (((centeredY - translateY.value) / scale.value) * LOGICAL_HEIGHT) /
                    (imageHeight ?? 1) +
                LOGICAL_HEIGHT / 2;

            runOnJS(onTap ?? addPoint)(x, y);
        });
    const gesture = Gesture.Simultaneous(pan, pinch, tap);

    return gesture;
}
