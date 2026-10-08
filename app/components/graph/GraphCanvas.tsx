import React, { useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, SharedValue } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from '../../theme';
import AppIcon from '../AppIcon';
import { RegressionLine } from './RegressionLine';
import type { Point, InteractionMode } from '../../types/geometry';
import type { Calibration, CalibrationSelection } from '../../calibration/types';
import type { Dataset } from '../../datasets/types';
import type { LinearRegressionResult } from '../../analysis/types';
import type { SharedCalibrationPoints } from './DraggableCalibrationPoint';
import { DraggableCalibrationPoint } from './DraggableCalibrationPoint';
import { AnimatedCalibrationAxis } from './AnimatedCalibrationAxis';
import { DraggablePoint } from './DraggablePoint';
import { AnimatedDatasetPath } from './AnimatedDatasetPath';
import { useCanvasGestures } from './useCanvasGestures';
import type { ImageSize } from '../../image/useImageManager';
import { DraggableCrosshairGuide } from './DraggableCrosshairGuide';
import TracePreview from './TracePreview';

interface GraphCanvasProps {
    image: string | null;
    pickImage: () => void;
    storageReady: boolean;
    datasets: Dataset[];
    calibration: Calibration;
    currentMode: InteractionMode;
    activeDatasetId: string | null;
    activeDataset: Dataset | null;
    selectedPointRef: {
        datasetId: string;
        pointId: string;
    } | null;
    setSelectedPointRef: React.Dispatch<
        React.SetStateAction<{
            datasetId: string;
            pointId: string;
        } | null>
    >;
    transformedActive: Point[];
    regression: LinearRegressionResult | null;
    showRegressionLine: boolean;
    commitPointDrag: (id: string, x: number, y: number) => void;
    commitCalibrationDrag: (dragTarget: CalibrationSelection, x: number, y: number) => void;
    addPoint: (x: number, y: number) => void;
    onCanvasTap?: (x: number, y: number) => void;
    tracePreview: Point[];
    traceStart: Point | null;
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
    imageSize: ImageSize | null;
    setViewportSize: React.Dispatch<
        React.SetStateAction<{
            width: number;
            height: number;
        }>
    >;
    setZoomDisplay: React.Dispatch<React.SetStateAction<number>>;
    setTranslation: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export default function GraphCanvas(props: GraphCanvasProps) {
    const {
        image,
        pickImage,
        storageReady,
        datasets,
        calibration,
        currentMode,
        activeDatasetId,
        activeDataset,
        selectedPointRef,
        transformedActive,
        regression,
        showRegressionLine,
        setSelectedPointRef,
        commitPointDrag,
        commitCalibrationDrag,
        addPoint,
        onCanvasTap,
        tracePreview,
        traceStart,
        scale,
        translateX,
        translateY,
        savedScale,
        savedTranslateX,
        savedTranslateY,
        displaySize,
        imageSize,
        setViewportSize,
        setZoomDisplay,
        setTranslation,
    } = props;

    const imageWidth = imageSize?.width ?? null;
    const imageHeight = imageSize?.height ?? null;

    // Behaviour
    const gesture = useCanvasGestures({
        addPoint,
        onTap: onCanvasTap,
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
    });

    // Animated styles
    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    // Shared values
    const sharedCalibrationPoints = useSharedValue<SharedCalibrationPoints>({
        origin: { x: 0, y: 0 },
        x0: { x: 0, y: null },
        x1: { x: 0, y: null },
        y0: { x: null, y: 0 },
        y1: { x: null, y: 0 },
    });
    useEffect(() => {
        sharedCalibrationPoints.value = {
            origin: { x: calibration.origin.x, y: calibration.origin.y },
            x0: { x: calibration.x.p0, y: null },
            x1: { x: calibration.x.p1, y: null },
            y0: { x: null, y: calibration.y.p0 },
            y1: { x: null, y: calibration.y.p1 },
        };
    }, [calibration, sharedCalibrationPoints]);

    const sharedDatasets = useSharedValue<Dataset[]>([]);
    useEffect(() => {
        sharedDatasets.value = datasets.map((dataset) => ({
            ...dataset,
            points: dataset.points.map((point) => ({
                ...point,
            })),
        }));
    }, [datasets, sharedDatasets]);

    return (
        <View
            style={styles.canvasViewport}
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;

                setViewportSize({ width: width, height: height });
            }}
        >
            {!image && (
                <TouchableOpacity
                    style={[styles.emptyWorkspace, !storageReady && { opacity: 0.3 }]}
                    onPress={pickImage}
                >
                    <AppIcon name={'add'} size={48} colour={COLOURS.buttonIcon} />

                    <Text style={styles.emptyTitle}>Import a graph image</Text>

                    <Text style={styles.emptySubtitle}>
                        Start digitizing by selecting an image.
                    </Text>
                </TouchableOpacity>
            )}
            {image && (!imageWidth || !imageHeight) && (
                <TouchableOpacity
                    style={[styles.emptyWorkspace, !storageReady && { opacity: 0.3 }]}
                    onPress={pickImage}
                >
                    <AppIcon name={'add'} size={48} colour={COLOURS.buttonIcon} />

                    <Text numberOfLines={1} ellipsizeMode="middle" style={styles.warningText}>
                        Couldn't load the image file.
                    </Text>

                    <Text style={styles.emptySubtitle}>Please select an alternative image.</Text>
                </TouchableOpacity>
            )}
            {image && imageWidth && imageHeight && (
                <>
                    <GestureDetector gesture={gesture}>
                        <View
                            style={[
                                styles.imageContainer,
                                {
                                    width: displaySize.width,
                                    height: displaySize.height,
                                },
                            ]}
                        >
                            <Animated.View style={animatedImageStyle}>
                                <Image
                                    source={{ uri: image }}
                                    style={[
                                        {
                                            width: imageWidth,
                                            height: imageHeight,
                                        },
                                    ]}
                                />

                                {(tracePreview.length > 0 || traceStart) && (
                                    <TracePreview
                                        points={tracePreview}
                                        start={traceStart}
                                        imageWidth={imageWidth}
                                        imageHeight={imageHeight}
                                    />
                                )}

                                <AnimatedCalibrationAxis
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    calibrationAxis={'X'}
                                    mode={currentMode}
                                    colour={'green'}
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    onDragComplete={commitCalibrationDrag}
                                />

                                <AnimatedCalibrationAxis
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    calibrationAxis={'Y'}
                                    mode={currentMode}
                                    colour={'orange'}
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    onDragComplete={commitCalibrationDrag}
                                />

                                <DraggableCalibrationPoint
                                    calibrationType={'origin'}
                                    mode={currentMode}
                                    colour="blue"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={commitCalibrationDrag}
                                />

                                {calibration.x.p0 && (
                                    <DraggableCalibrationPoint
                                        calibrationType={'x0'}
                                        mode={currentMode}
                                        colour="green"
                                        scale={scale}
                                        imageWidth={imageWidth}
                                        imageHeight={imageHeight}
                                        sharedCalibrationPoints={sharedCalibrationPoints}
                                        onDragComplete={commitCalibrationDrag}
                                    />
                                )}

                                {calibration.y.p0 && (
                                    <DraggableCalibrationPoint
                                        calibrationType={'y0'}
                                        mode={currentMode}
                                        colour="orange"
                                        scale={scale}
                                        imageWidth={imageWidth}
                                        imageHeight={imageHeight}
                                        sharedCalibrationPoints={sharedCalibrationPoints}
                                        onDragComplete={commitCalibrationDrag}
                                    />
                                )}

                                <DraggableCalibrationPoint
                                    calibrationType={'x1'}
                                    mode={currentMode}
                                    colour="green"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={commitCalibrationDrag}
                                />

                                <DraggableCalibrationPoint
                                    calibrationType={'y1'}
                                    mode={currentMode}
                                    colour="orange"
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedCalibrationPoints={sharedCalibrationPoints}
                                    onDragComplete={commitCalibrationDrag}
                                />
                                <DraggableCrosshairGuide
                                    axis={'x'}
                                    isEnabled={
                                        currentMode === 'points' && activeDataset?.locked === false
                                    }
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedDatasets={sharedDatasets}
                                    onDragComplete={commitPointDrag}
                                    selectedPointRef={selectedPointRef}
                                />
                                <DraggableCrosshairGuide
                                    axis={'y'}
                                    isEnabled={
                                        currentMode === 'points' && activeDataset?.locked === false
                                    }
                                    scale={scale}
                                    imageWidth={imageWidth}
                                    imageHeight={imageHeight}
                                    sharedDatasets={sharedDatasets}
                                    onDragComplete={commitPointDrag}
                                    selectedPointRef={selectedPointRef}
                                />
                                {showRegressionLine &&
                                    regression != null &&
                                    regression.intercept != null &&
                                    regression.slope != null &&
                                    transformedActive.length >= 2 && (
                                        <Svg style={[StyleSheet.absoluteFill]}>
                                            <RegressionLine
                                                points={transformedActive}
                                                regression={regression}
                                                calibration={calibration}
                                                imageWidth={imageWidth}
                                                imageHeight={imageHeight}
                                                colour={'gray'}
                                                scale={scale}
                                            />
                                        </Svg>
                                    )}

                                {datasets.map((d, datasetIndex) => {
                                    if (
                                        !d.visible ||
                                        d.curveMode === 'none' ||
                                        (d?.points?.length ?? 0) < 2
                                    ) {
                                        return null;
                                    }

                                    return (
                                        <Svg key={d.id} style={[StyleSheet.absoluteFill]}>
                                            <AnimatedDatasetPath
                                                datasetIndex={datasetIndex}
                                                sharedDatasets={sharedDatasets}
                                                imageWidth={imageWidth}
                                                imageHeight={imageHeight}
                                                curveMode={d.curveMode}
                                                colour={d.colour}
                                                scale={scale}
                                            />
                                        </Svg>
                                    );
                                })}
                                {datasets.map((d, datasetIndex) =>
                                    (d.points || []).map((p, pointIndex) => {
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
                                                sharedDatasets={sharedDatasets}
                                                onDragComplete={commitPointDrag}
                                                setSelectedPointRef={setSelectedPointRef}
                                            />
                                        );
                                    }),
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

    warningText: {
        ...TYPOGRAPHY.body,
        color: 'red',
        textAlign: 'center',
    },
});
