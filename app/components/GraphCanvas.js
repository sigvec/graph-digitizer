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

function DraggableCalibrationPoint({
    calibrationType,
    mode,
    colour,
    scale,
    imageWidth,
    imageHeight,
    sharedCalibrationPoints,
    onDragComplete,
}) {

    const calibrationEnabled = mode !== 'points';

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 50;

    const panGesture = Gesture.Pan()
        .enabled(calibrationEnabled)
        .hitSlop({ left: SLOP, right: SLOP, top: SLOP, bottom: SLOP })
        .onStart(() => {
            contextX.value = sharedCalibrationPoints.value[calibrationType].x;
            contextY.value = sharedCalibrationPoints.value[calibrationType].y;
        })
        .onUpdate((event) => {
            let translateX;
            let translateY;

            if (calibrationType === 'origin' || calibrationType == 'xRef') {
                translateX = contextX.value + event.translationX * LOGICAL_WIDTH / imageWidth / scale.value;
            } else {
                translateX = sharedCalibrationPoints.value.origin.x;
            }
            if (calibrationType === 'origin' || calibrationType == 'yRef') {
                translateY = contextY.value + event.translationY * LOGICAL_HEIGHT / imageHeight / scale.value;
            } else {
                translateY = contextY.value;
            }

            const c = {
                ...sharedCalibrationPoints.value,
            };

            c[calibrationType] = {
                ...c[calibrationType],
                x: translateX,
                y: translateY,
            };

            sharedCalibrationPoints.value = c;

        })
        .onEnd(() => {
            runOnJS(onDragComplete)(calibrationType, sharedCalibrationPoints.value[calibrationType].x, sharedCalibrationPoints.value[calibrationType].y);
        });


    const RADIUS = 60;

    const containerStyle = {
        position: "absolute",
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderRadius: RADIUS,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -RADIUS,
        marginTop: -RADIUS,
    }

    const coreDot = {
        position: "absolute",
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderRadius: (RADIUS),
        backgroundColor: colour,
        zIndex: 1,
    }

    const outerRing = {
        position: "absolute",
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderRadius: 1.5 * (RADIUS),
        borderWidth: 15,
        backgroundColor: "#00000000",
        borderColor: 'white',
        zIndex: 2,
    }

    const animatedProps = useAnimatedStyle(() => {

        let translateX;
        let translateY;

        if (calibrationType === 'origin' || calibrationType == 'xRef') {
            translateX = sharedCalibrationPoints.value[calibrationType].x;
        } else {
            translateX = sharedCalibrationPoints.value.origin.x;
        }
        if (calibrationType === 'origin' || calibrationType == 'yRef') {
            translateY = sharedCalibrationPoints.value[calibrationType].y;
        } else {
            translateY = sharedCalibrationPoints.value.origin.y;
        }

        return (
            {
                transform: [
                    { translateX: translateX * imageWidth / LOGICAL_WIDTH },
                    { translateY: translateY * imageHeight / LOGICAL_HEIGHT },
                    { scale: 0.1 / scale.value }
                ],
            }
        )
    });

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[
                containerStyle,
                animatedProps,
            ]}>
                <View style={[
                    coreDot,
                ]} />
                {mode !== 'points' && <View style={[
                    outerRing,
                ]} />}
            </Animated.View>
        </GestureDetector>
    );
}

function AnimatedCalibrationPath({
    calibrationPoints,
    imageWidth,
    imageHeight,
    scale
}) {

    if (!calibrationPoints) {
        return { d: '' };
    }

    const animatedProps1 = useAnimatedProps(() => {
        const c = calibrationPoints.value;
        const points = (
            [
                { x: c.origin.x, y: c.origin.y },
                { x: c.origin.x, y: c.yRef.y }
            ]
        );

        const d = pointsToPath(points, imageWidth, imageHeight, 'linear');

        return {
            strokeWidth: 5 / scale.value,
            d: d
        };
    });

    const animatedProps2 = useAnimatedProps(() => {
        const c = calibrationPoints.value;
        const points = (
            [
                { x: c.origin.x, y: c.origin.y },
                { x: c.xRef.x, y: c.origin.y }
            ]
        );

        const d = pointsToPath(points, imageWidth, imageHeight, 'linear');

        return {
            strokeWidth: 5 / scale.value,
            d: d
        };
    });

    return (
        <>
            <AnimatedPath
                animatedProps={animatedProps1}
                stroke={"orange"}
                fill="none"
            />
            <AnimatedPath
                animatedProps={animatedProps2}
                stroke={"green"}
                fill="none"
            />
        </>
    );
}

function DraggablePoint({
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
}) {
    // Use starting positions directly as initial shared values
    const translateX = useSharedValue(item.x);
    const translateY = useSharedValue(item.y);

    const contextX = useSharedValue(0);
    const contextY = useSharedValue(0);

    const SLOP = 50;

    const isEnabled = (!datasetIsLocked && datasetIsActive && mode === 'points')
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
            runOnJS(onDragComplete)(item.id, translateX.value, translateY.value);
        });


    const RADIUS = 40;

    const containerStyle = {
        position: "absolute",
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderRadius: RADIUS,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -RADIUS,
        marginTop: -RADIUS,
        opacity: mode !== 'points' ? 0.4
            : datasetIsLocked ? 0.8 : 1,
    }

    const ring = {
        position: "absolute",
        borderRadius: 999
    }

    const coreDot = {
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        backgroundColor: colour,
        zIndex: 1,
    }

    const innerRing = {
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderWidth: isSelected ? 28 : 18,
        backgroundColor: "#00000000",
        borderColor: 'white',
        zIndex: 2,
    }

    const outerRing = {
        width: 2 * (RADIUS),
        height: 2 * (RADIUS),
        borderWidth: 6,
        backgroundColor: "#00000000",
        borderColor: 'black',
        zIndex: 3,
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


                    <View style={[
                        ring,
                        coreDot,
                    ]} />

                    {datasetIsActive && (
                        <>
                            <View style={[
                                ring,
                                innerRing
                            ]} />
                            <View style={[
                                ring,
                                outerRing
                            ]} />
                        </>
                    )}
                </Animated.View>
            </GestureDetector>
        </>
    );
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
        currentMode,

        activeDataset,
        activeDatasetId,
        selectedPointRef,
        setSelectedPointRef,
        finishDragTransaction,
        finishCalibrationDragTransaction,
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

    const sharedCalibrationPoints = useSharedValue([]);

    useEffect(() => {
        sharedCalibrationPoints.value =
        {
            origin: { x: calibration.origin.x, y: calibration.origin.y },
            xRef: { x: calibration.xRef.x, y: calibration.xRef.y },
            yRef: { x: calibration.yRef.x, y: calibration.yRef.y }
        }
    }, [calibration]);

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
                        colour={COLOURS.buttonIcon}
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
                        colour={COLOURS.buttonIcon}
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
                                            width: imageWidth,
                                            height: imageHeight,
                                        }
                                    ]
                                } />

                                <Svg
                                    style={[
                                        StyleSheet.absoluteFill
                                    ]}
                                >
                                    <AnimatedCalibrationPath
                                        calibrationPoints={sharedCalibrationPoints}
                                        imageWidth={imageWidth}
                                        imageHeight={imageHeight}
                                        scale={scale}
                                    />

                                </Svg>

                                <DraggableCalibrationPoint
                                    calibrationType={'origin'}
                                    mode={currentMode}
                                    colour="blue"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={finishCalibrationDragTransaction}
                                />

                                <DraggableCalibrationPoint
                                    calibrationType={'xRef'}
                                    mode={currentMode}
                                    colour="green"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={finishCalibrationDragTransaction}
                                />

                                <DraggableCalibrationPoint
                                    calibrationType={'yRef'}
                                    mode={currentMode}
                                    colour="orange"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={finishCalibrationDragTransaction}
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
                                                    datasetIndex={datasetIndex}
                                                    sharedDatasetPoints={sharedDatasets}
                                                    imageWidth={imageWidth}
                                                    imageHeight={imageHeight}
                                                    curveMode={d.curveMode}
                                                    colour={d.colour}
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
                                                    mode={currentMode}
                                                    item={p}
                                                    colour={d.colour}
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