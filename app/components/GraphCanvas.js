import React, { useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    Text
} from 'react-native';

import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';

import Animated, {
    useAnimatedStyle,
    runOnJS,
    useSharedValue,
    useAnimatedProps,
} from 'react-native-reanimated';

import Svg, { Line, Path } from 'react-native-svg';

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import {
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
} from '../constants/geometry';

import AppIcon from './AppIcon'

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);

function generateSpline(points, segments = 20) {
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

function CalibrationLine({
    p1,
    p2,
    colour,
    scale,
    imageWidth,
    imageHeight,
}) {

    if (!p1 || !p2) {
        return null;
    }

    const p1x = (p1.x) * imageWidth / LOGICAL_WIDTH
    const p1y = (p1.y) * imageHeight / LOGICAL_HEIGHT
    const p2x = (p2.x) * imageWidth / LOGICAL_WIDTH
    const p2y = (p2.y) * imageHeight / LOGICAL_HEIGHT

    const animatedProps =
        useAnimatedProps(() => ({
            strokeWidth: 5 / scale.value,
        }));

    return (
        <Svg
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
        >
            <AnimatedLine
                x1={p1x}
                y1={p1y}
                x2={p2x}
                y2={p2y}
                stroke={colour}
                animatedProps={animatedProps}
            />
        </Svg>
    );
}

function CalibrationDot({
    key,
    p1,
    color,
    scale,
    imageWidth,
    imageHeight,
}) {

    if (!p1) {
        return null;
    }

    const DOT_RADIUS = 5;

    const dotStyle = useAnimatedStyle(() => ({
        position: "absolute",
        left: -DOT_RADIUS,
        top: -DOT_RADIUS,
        width: 2 * DOT_RADIUS,
        height: 2 * DOT_RADIUS,
        borderRadius: DOT_RADIUS,
        backgroundColor: color,
        transform: [
            { translateX: (p1.x) * imageWidth / LOGICAL_WIDTH },
            { translateY: (p1.y) * imageHeight / LOGICAL_HEIGHT },
            { scale: 1 / scale.value }
        ],
    }));

    return (
        <Animated.View
            style={dotStyle}
        />
    );
}

function DraggablePoint({
    item,
    pointIndex,
    datasetIndex,
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
}) {
    // Use starting positions directly as initial shared values
    const translateX = useSharedValue(item.x);
    const translateY = useSharedValue(item.y);

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 10;

    const panGesture = Gesture.Pan()
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            if (datasetIsLocked || !datasetIsActive) {
                return;
            }

            contextX.value = translateX.value;
            contextY.value = translateY.value;

            runOnJS(setSelectedPointRef)({
                datasetId: datasetId,
                pointId: item.id,
            });

        })
        .onUpdate((event) => {
            if (datasetIsLocked || !datasetIsActive) {
                return;
            }
            translateX.value = contextX.value + event.translationX * LOGICAL_WIDTH / imageWidth / scale.value;
            translateY.value = contextY.value + event.translationY * LOGICAL_HEIGHT / imageHeight / scale.value;

            sharedDatasetPoints.modify(value => {
                value[datasetIndex][pointIndex] = {
                    x: translateX.value,
                    y: translateY.value,
                };
                return value;
            });

        })
        .onEnd(() => {
            if (datasetIsLocked || !datasetIsActive) {
                return;
            }
            // Send accurate final coordinates back to the image array
            runOnJS(onDragComplete)(item.id, translateX.value, translateY.value);
        });


    const RADIUS = 30;
    const RING_THICK = 5;

    const containerStyle = {
        position: "absolute",
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderRadius: RADIUS,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -RADIUS,
        marginTop: -RADIUS,
        opacity: datasetIsLocked ? 0.8 : 1,
    }

    const coreDot = {
        position: "absolute",
        width: 2 * (RADIUS - RING_THICK),
        height: 2 * (RADIUS - RING_THICK),
        borderRadius: (RADIUS - RING_THICK),
        backgroundColor: colour,
        zIndex: 3,
    }

    const ring = {
        position: "absolute",
        borderRadius: 999
    }

    const innerRing = {
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        backgroundColor: isSelected ? 'white' : colour,
        zIndex: 2
    }
    const outerRing = {
        width: 2 * (RADIUS + 3 * RING_THICK),
        height: 2 * (RADIUS + 3 * RING_THICK),
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: 'black',
        zIndex: 1
    }

    const animatedProps = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value * imageWidth / LOGICAL_WIDTH },
            { translateY: translateY.value * imageHeight / LOGICAL_HEIGHT },
            { scale: 0.1 / scale.value }
        ],
    }));

    const cursorHorProps = useAnimatedStyle(() => ({
        position: "absolute",
        left: 0,
        top: translateY.value * imageHeight / LOGICAL_HEIGHT - 1 / scale.value,
        width: imageWidth,
        height: 2 / scale.value,
        backgroundColor: "#535353",
        opacity: 0.2,

    }));

    const cursorVerProps = useAnimatedStyle(() => ({
        position: "absolute",
        left: translateX.value * imageWidth / LOGICAL_HEIGHT - 1 / scale.value,
        top: 0,
        width: 2 / scale.value,
        height: imageHeight,
        backgroundColor: "#535353",
        opacity: 0.2,

    }));

    useEffect(() => {
        // If the parent state changes externally, sync the shared values
        translateX.value = item.x;
        translateY.value = item.y;
    }, [item.x, item.y]);

    return (

        <>
            {isSelected && (<>
                {/* Horizontal line */}
                <Animated.View
                    style={[
                        cursorHorProps
                    ]}
                />

                {/* Vertical line */}
                <Animated.View
                    style={[
                        cursorVerProps
                    ]}
                />
            </>
            )}

            <GestureDetector gesture={panGesture}>
                <Animated.View style={[
                    containerStyle,
                    animatedProps,
                ]}>

                    {datasetIsActive && (
                        <View style={[
                            ring,
                            outerRing
                        ]} />
                    )}
                    <View style={[
                        coreDot,
                    ]} />
                    <View style={[
                        ring,
                        innerRing
                    ]} />
                </Animated.View>
            </GestureDetector>
        </>
    );
}

function pointsToPath(points, imageWidth, imageHeight, curveMode) {
    'worklet';

    if ((points?.length ?? 0) < 2) {
        return '';
    }

    let curvePoints;

    switch (curveMode) {

        case 'none':
            return null;

        case 'linear':
            curvePoints = points;
            break;

        case 'spline':
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

function AnimatedDatasetPath({
    datasetIndex,
    sharedDatasetPoints,
    imageWidth,
    imageHeight,
    curveMode,
    colour,
    scale
}) {

    const animatedProps = useAnimatedProps(() => {
        const points =
            sharedDatasetPoints.value[datasetIndex];
        if (!points || points.length < 2) {
            return { d: '' };
        }

        const d = pointsToPath(points, imageWidth, imageHeight, curveMode);

        return {
            strokeWidth: 3 / scale.value,
            d: d
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

export default function GraphCanvas(props) {
    const {
        image,
        pickImage,
        datasets,
        calibration,

        activeDataset,
        activeDatasetId,
        selectedPointRef,
        setSelectedPointRef,
        finishDragTransaction,
        addPoint,
        setPointPosition,

        scale,
        translateX,
        translateY,
        savedScale,
        savedTranslateX,
        savedTranslateY,

        displaySize,
        imageWidth,
        imageHeight,
        viewportSize,
        setViewportSize,

        setZoomDisplay,

    } = props;

    // ---------- gestures ----------
    const lastScale = useSharedValue(1);

    // Dynamic values to anchor the exact scaling focal point
    const focalX = useSharedValue(0);
    const focalY = useSharedValue(0);

    const fitScale = Math.min(
        displaySize.width / imageWidth,
        displaySize.height / imageHeight
    );

    const maxScale = fitScale * 4;
    const minScale = fitScale * 0.5;


    const pan = Gesture.Pan()
        .onStart((e) => {
            if (e.numberOfPointers !== 1) return;
        })
        .onUpdate((e) => {
            if (e.numberOfPointers !== 1) return;
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
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

            focalX.value =
                (centeredFocalX - savedTranslateX.value) / savedScale.value;

            focalY.value =
                (centeredFocalY - savedTranslateY.value) / savedScale.value;

        })

        .onUpdate((e) => {
            if (e.numberOfPointers < 2) return;

            const newScale = Math.max(minScale, Math.min(maxScale, savedScale.value * e.scale));
            scale.value = newScale;

            // 2. Calculate the difference between the starting scale and current scale
            const scaleRatio = newScale / savedScale.value;

            // 3. Adjust the layout translation cleanly based on the locked anchor point
            translateX.value = scaleRatio + savedTranslateX.value + savedScale.value * (focalX.value * (1 - scaleRatio));
            translateY.value = scaleRatio + savedTranslateY.value + savedScale.value * (focalY.value * (1 - scaleRatio));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;

            runOnJS(setZoomDisplay)(scale.value / fitScale);
        });


    const tap = Gesture.Tap()
        .maxDistance(6)
        .maxDuration(250)
        .onEnd((e) => {
            const centeredX = e.x - displaySize.width / 2;
            const centeredY = e.y - displaySize.height / 2;

            const x =
                (centeredX - translateX.value) / scale.value * LOGICAL_WIDTH / imageWidth +
                LOGICAL_WIDTH / 2;

            const y =
                (centeredY - translateY.value) / scale.value * LOGICAL_HEIGHT / imageHeight +
                LOGICAL_HEIGHT / 2;

            runOnJS(addPoint)(x, y);

        });

    const composed = Gesture.Simultaneous(pan, pinch, tap);

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const sharedDatasets = useSharedValue([]);

    useEffect(() => {
        sharedDatasets.value =
            datasets.map(dataset =>
                dataset.points.map(point => ({
                    x: point.x,
                    y: point.y,
                }))
            );
    }, [datasets]);

    return (
        <View
            style={styles.canvasViewport}
            onLayout={e => {
                const { width, height } =
                    e.nativeEvent.layout;

                setViewportSize({ width: width, height: height });
            }}
        >
            {!image && (
                <TouchableOpacity style={styles.emptyWorkspace} onPress={pickImage}>

                    <AppIcon
                        name={"add"}
                        size={48}
                        color={COLOURS.buttonIcon}
                    />

                    <Text style={styles.emptyTitle}>
                        Import a graph image
                    </Text>

                    <Text style={styles.emptySubtitle}>
                        Start digitizing by selecting an image.
                    </Text>

                </TouchableOpacity>
            )}
            {image && (!imageWidth || !imageHeight) && (
                <TouchableOpacity style={styles.emptyWorkspace} onPress={pickImage}>

                    <AppIcon
                        name={"add"}
                        size={48}
                        color={COLOURS.buttonIcon}
                    />

                    <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                    >
                        Couldn't load the image file.
                    </Text>

                    <Text style={styles.emptySubtitle}>
                        Please select an alternative image.
                    </Text>

                </TouchableOpacity>
            )}
            {image && imageWidth && imageHeight && (
                <>
                    <GestureDetector gesture={composed}>
                        <View style={
                            [
                                styles.imageContainer,
                                {
                                    width: displaySize.width,
                                    height: displaySize.height,
                                }

                            ]
                        }>
                            <Animated.View style={animatedImageStyle}>
                                <Image source={{ uri: image }} style={
                                    [
                                        {
                                            width: imageWidth / 1,
                                            height: imageHeight / 1,
                                        }
                                    ]
                                } />

                                <CalibrationLine
                                    p1={calibration.origin}
                                    p2={{ x: calibration?.xRef?.x, y: calibration?.origin?.y }}
                                    colour="green"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                />

                                <CalibrationLine
                                    p1={calibration.origin}
                                    p2={{ x: calibration?.origin?.x, y: calibration?.yRef?.y }}
                                    colour="orange"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                />

                                <CalibrationDot
                                    p1={calibration.origin}
                                    color="blue"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                />

                                <CalibrationDot
                                    p1={{ x: calibration.xRef.x, y: calibration.origin.y }}
                                    color="green"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                />

                                <CalibrationDot
                                    p1={{ x: calibration.origin.x, y: calibration.yRef.y }}
                                    color="orange"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                />

                                {datasets
                                    .map((d, datasetIndex) => {

                                        if (!d.visible || d.curveMode == 'none' || (d?.points?.length ?? 0) < 2) {
                                            return null;
                                        }

                                        return (
                                            <Svg
                                                key={d.id}
                                                style={[
                                                    StyleSheet.absoluteFill
                                                ]}
                                            >
                                                <AnimatedDatasetPath
                                                    key={d.id}
                                                    datasetIndex={datasetIndex}
                                                    sharedDatasetPoints={sharedDatasets}
                                                    imageWidth={imageWidth}
                                                    imageHeight={imageHeight}
                                                    curveMode={d.curveMode}
                                                    colour={d.color}
                                                    scale={scale}
                                                />

                                            </Svg>

                                        )
                                    }

                                    )
                                }
                                {datasets
                                    .map((d, datasetIndex) => (d.points || [])
                                        .map((p, pointIndex) => {
                                            if (!d.visible) {
                                                return null;
                                            }
                                            const datasetIsActive = activeDatasetId === d.id;
                                            const isSelected =
                                                selectedPointRef?.datasetId === d.id &&
                                                selectedPointRef?.pointId === p.id;
                                            return (
                                                <DraggablePoint
                                                    key={p.id}
                                                    pointIndex={pointIndex}
                                                    datasetIndex={datasetIndex}
                                                    item={p}
                                                    colour={d.color}
                                                    isSelected={isSelected}
                                                    datasetId={d.id}
                                                    datasetIsActive={datasetIsActive}
                                                    datasetIsLocked={d.locked}
                                                    scale={scale}
                                                    imageWidth={imageWidth}
                                                    imageHeight={imageHeight}
                                                    sharedDatasetPoints={sharedDatasets}
                                                    onDragComplete={finishDragTransaction}
                                                    setSelectedPointRef={setSelectedPointRef}
                                                />
                                            )
                                        })
                                    )}
                            </Animated.View>
                        </View>
                    </GestureDetector>
                </>
            )}
        </View>
    );
}


const styles = StyleSheet.create({
    imageContainer: {
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    canvasViewport: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyWorkspace: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyTitle: {
        ...TYPOGRAPHY.title,
        marginBottom: SPACING.sm,
        color: COLOURS.text,
    },
    emptySubtitle: {
        ...TYPOGRAPHY.body,
        color: COLOURS.muted,
        textAlign: 'center',
    },

});