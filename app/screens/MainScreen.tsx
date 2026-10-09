import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from '../theme';
import {
    LOGICAL_WIDTH,
    LOGICAL_HEIGHT,
    DISPLAY_PADDING,
    DEFAULT_CALIBRATION,
} from '../constants/geometry';
import { AxisScale } from '../calibration/constants';

import AppIcon from '../components/AppIcon';
import IconButton from '../components/IconButton';
import MenuButton from '../components/MenuButton';
import TabButton from '../components/TabButton';
import GraphCanvas from '../components/graph/GraphCanvas';
import CalibrationTab from '../components/Tabs/CalibrationTab';
import AnalysisTab from '../components/Tabs/AnalysisTab';
import ProjectTab from '../components/Tabs/ProjectTab';
import PointTab from '../components/Tabs/PointTab';
import TraceTab from '../components/Tabs/TraceTab';
import DatasetsTab from '../components/Tabs/DatasetsTab';
import { TextInputModal, ProjectMenuModal, ColourPickerModal, Dialog } from '../components/Modals';
import HelpModal from '../components/HelpModal';

import { transformPoint, getRegressionPredictor } from '../calibration/transform';
import { computeStats } from '../analysis/stats';
import { linearRegression, computeR2 } from '../analysis/regression';
import { prepareRegressionPoints } from '../analysis/prepareRegressionPoints';
import { loadAllProjects } from '../../frontend/services/storage/localStorage';
import { removeOrphanedImages } from '../../frontend/services/storage/imageStorage';
import { hydrateProject } from '../utils/projectTransform';
import { loadDecodedImage } from '../../frontend/services/imageAnalysis/imageLoader';

import { useHistoryState } from '../hooks/useHistoryState';
import { useGraphInteraction } from '../hooks/useGraphInteraction';
import {
    useDatasetActions,
    createEmptyDataset,
    createDuplicateDataset,
} from '../hooks/useDatasetActions';
import { useProjectManager, DialogPayload } from '../project/useProjectManager';
import { StoredProject } from '../../frontend/services/sharing/Project';
import { DecodedImage } from '../../frontend/services/imageAnalysis/types';
import { InteractionMode } from '../types/geometry';
import { LastShare } from '../project/types';
import { CalibrationSelection } from '../calibration/types';
import { ImageSize, useImageManager } from '../image/useImageManager';
import type { Point } from '../types/geometry';
import { generateId } from '../utils/id';
import { CentrelineNavigationTracer } from '../../frontend/services/imageAnalysis/curveTracing/CentrelineNavigationTracer';
import { createTraceImage } from '../../frontend/services/imageAnalysis/curveTracing/decodedImageTraceImage';
import type { TracePoint } from '../../frontend/services/imageAnalysis/curveTracing/types';
import { snapVector } from '../../frontend/services/imageAnalysis/snap';
import {
    darkness,
    luminance,
} from '../../frontend/services/imageAnalysis/curveTracing/imageMetrics';

interface MainScreenProps {
    currentProjectId: string | null;
    setCurrentProjectId: React.Dispatch<React.SetStateAction<string | null>>;
    onOpenList: () => void;
    incomingProject: StoredProject | null;
    setIncomingProject: React.Dispatch<React.SetStateAction<StoredProject | null>>;
    isDirty: boolean;
    onDirtyChanged: (newValue: boolean) => void;
}
export default function MainScreen({
    currentProjectId,
    setCurrentProjectId,
    onOpenList,
    incomingProject,
    setIncomingProject,
    isDirty,
    onDirtyChanged,
}: MainScreenProps) {
    // ==================================================
    // State
    // ==================================================

    //
    // Project
    // --------------------------------------------------
    const [projectName, setProjectName] = useState('Untitled Project');
    const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);
    const [projectUpdatedAt, setProjectUpdatedAt] = useState<string | null>(null);
    const [projectMenuVisible, setProjectMenuVisible] = useState(false);
    const [datasets, setDatasets] = useState([createEmptyDataset(0)]);
    const [activeDatasetId, setActiveDatasetId] = useState<string | null>(datasets[0].id);
    const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);
    const [calibratedState, setCalibratedState] = useState(false);
    const [calibrationSelection, setCalibrationSelection] =
        useState<CalibrationSelection>('origin');
    const [lastShare, setLastShare] = useState<LastShare | undefined>(undefined);
    const [storageReady, setStorageReady] = useState(false);
    const [isLoadingProject, setIsLoadingProject] = useState(false);
    const [isRestoringImage, setIsRestoringImage] = useState(false);
    //
    // Workspace
    // --------------------------------------------------
    const [workspaceTab, setWorkspaceTab] = useState('edit');
    const [showRegressionLine, setShowRegressionLine] = useState(false);
    //
    // Image
    // --------------------------------------------------
    const [image, setImage] = useState<string | null>(null);
    const [zoomDisplay, setZoomDisplay] = useState(1);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [imageSize, setImageSize] = useState<ImageSize | null>(null);
    //
    // Interaction
    // --------------------------------------------------
    const [selectedPointRef, setSelectedPointRef] = useState<{
        datasetId: string;
        pointId: string;
    } | null>(null);
    const [nudgeAllPoints, setNudgeAllPoints] = useState(false);
    const [translation, setTranslation] = useState({ x: 0, y: 0 });
    const [mode, setMode] = useState<InteractionMode>('points');
    const [tracePhase, setTracePhase] = useState<'idle' | 'awaitingDirection' | 'preview'>('idle');
    const [traceStart, setTraceStart] = useState<Point | null>(null);
    const [tracePreview, setTracePreview] = useState<Point[]>([]);
    const [traceDirectionMode, setTraceDirectionMode] = useState<'manual' | 'automatic'>('manual');
    //
    // Dialogs
    // --------------------------------------------------
    const [colourPickerVisible, setColourPickerVisible] = useState(false);
    const [dialogPayload, setDialogPayload] = useState<DialogPayload | null>(null);
    const [justCopied, setJustCopied] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [renameDatasetVisible, setRenameDatasetVisible] = useState(false);
    const [renameText, setRenameText] = useState('');
    const [renameProjectVisible, setRenameProjectVisible] = useState(false);
    const [saveAsVisible, setSaveAsVisible] = useState(false);

    // ==================================================
    // Refs / Shared Values
    // ==================================================

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const decodedImage = useRef<DecodedImage | null>(null);

    const displaySize = {
        width: Math.max(0, viewportSize.width - DISPLAY_PADDING * 2),
        height: Math.max(0, viewportSize.height - DISPLAY_PADDING * 2),
    };

    const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

    const resetTrace = () => {
        setTracePhase('idle');
        setTraceStart(null);
        setTracePreview([]);
    };

    // An in-progress trace is transient UI state, not part of project history.
    // Undo cancels it first; only a subsequent Undo changes project data.
    const handleUndoWithTraceCancel = () => {
        if (tracePhase !== 'idle') {
            resetTrace();
            return;
        }
        handleUndo();
    };

    const startCurveTrace = () => {
        // Recover if the project has no valid active dataset selected.
        // Selecting it here keeps trace acceptance attached to a real dataset.
        const selectedDataset = datasets.find((dataset) => dataset.id === activeDatasetId);
        const fallbackDataset = selectedDataset ?? datasets[0];

        if (!fallbackDataset) {
            return;
        }

        if (!selectedDataset) {
            setActiveDatasetId(fallbackDataset.id);
        }

        if (
            mode !== 'points' ||
            !image ||
            !decodedImage.current ||
            !fallbackDataset.visible ||
            fallbackDataset.locked
        ) {
            return;
        }

        setTracePreview([]);
        setTraceStart(null);
        setTracePhase('awaitingDirection');
    };

    const runCurveTrace = (start: Point, direction: { x: number; y: number }) => {
        const directionLength = Math.hypot(direction.x, direction.y);
        if (directionLength < 1) return;

        const decoded = decodedImage.current;
        if (!decoded) {
            resetTrace();
            return;
        }

        const traceImage = createTraceImage(decoded);
        const imageStart: TracePoint = {
            x: (start.x * decoded.width) / LOGICAL_WIDTH,
            y: (start.y * decoded.height) / LOGICAL_HEIGHT,
        };
        const imageDirection = {
            x: (direction.x * decoded.width) / LOGICAL_WIDTH,
            y: (direction.y * decoded.height) / LOGICAL_HEIGHT,
        };

        const tracer = new CentrelineNavigationTracer();
        const traceOptions = { stepSize: 1, searchRadius: 3, maxPoints: 3000 };
        const forwardResult = tracer.trace(traceImage, imageStart, imageDirection, traceOptions);
        const backwardResult = tracer.trace(
            traceImage,
            imageStart,
            { x: -imageDirection.x, y: -imageDirection.y },
            traceOptions,
        );
        const combinedPoints = [
            ...backwardResult.points.slice(1).reverse(),
            ...forwardResult.points,
        ];
        const logicalPoints = combinedPoints.map((point) => ({
            id: generateId(),
            x: (point.x * LOGICAL_WIDTH) / decoded.width,
            y: (point.y * LOGICAL_HEIGHT) / decoded.height,
        }));

        if (logicalPoints.length < 2) {
            resetTrace();
            return;
        }
        setTracePreview(logicalPoints);
        setTracePhase('preview');
    };

    // Estimate the local curve tangent with a weighted principal-axis fit of
    // dark pixels around the snapped start. The sign is arbitrary because we
    // trace in both directions from this vector.
    const estimateTraceDirection = (
        image: ReturnType<typeof createTraceImage>,
        start: TracePoint,
    ): { x: number; y: number } | null => {
        const radius = 8;
        let totalWeight = 0;
        let meanX = 0;
        let meanY = 0;
        const samples: { x: number; y: number; weight: number }[] = [];

        for (
            let y = Math.max(0, Math.floor(start.y - radius));
            y <= Math.min(image.height - 1, Math.ceil(start.y + radius));
            y++
        ) {
            for (
                let x = Math.max(0, Math.floor(start.x - radius));
                x <= Math.min(image.width - 1, Math.ceil(start.x + radius));
                x++
            ) {
                const dx = x - start.x;
                const dy = y - start.y;
                if (dx * dx + dy * dy > radius * radius) continue;
                const weight = darkness(luminance(image.getPixel(x, y)));
                if (weight < 0.35) continue;
                samples.push({ x, y, weight });
                totalWeight += weight;
                meanX += x * weight;
                meanY += y * weight;
            }
        }

        if (samples.length < 3 || totalWeight === 0) return null;
        meanX /= totalWeight;
        meanY /= totalWeight;

        let xx = 0;
        let yy = 0;
        let xy = 0;
        for (const sample of samples) {
            const dx = sample.x - meanX;
            const dy = sample.y - meanY;
            xx += sample.weight * dx * dx;
            yy += sample.weight * dy * dy;
            xy += sample.weight * dx * dy;
        }

        if (Math.max(xx, yy) < 1e-6) return null;
        const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
        const direction = { x: Math.cos(angle), y: Math.sin(angle) };
        // Reject nearly isotropic neighborhoods: their orientation is ambiguous.
        const discriminant = Math.hypot(xx - yy, 2 * xy);
        if (discriminant / (xx + yy || 1) < 0.12) return null;
        return direction;
    };

    const handleTraceTap = (x: number, y: number) => {
        if (tracePhase === 'idle') {
            addPoint(x, y);
            return;
        }
        if (tracePhase === 'preview') return;

        const decoded = decodedImage.current;
        if (!traceStart) {
            const snap = decoded
                ? snapVector(
                      decoded,
                      x / LOGICAL_WIDTH,
                      y / LOGICAL_HEIGHT,
                      1 /
                          (Math.min(
                              displaySize.width / (imageSize?.width ?? 1),
                              displaySize.height / (imageSize?.height ?? 1),
                          ) || 1),
                      1 / (zoomDisplay || 1),
                  )
                : null;
            const start = {
                id: generateId(),
                x: x + (snap?.dx ?? 0) * LOGICAL_WIDTH,
                y: y + (snap?.dy ?? 0) * LOGICAL_HEIGHT,
            };
            if (traceDirectionMode === 'manual') {
                setTraceStart(start);
                return;
            }
            if (!decoded) {
                resetTrace();
                return;
            }
            const traceImage = createTraceImage(decoded);
            const imageStart = {
                x: (start.x * decoded.width) / LOGICAL_WIDTH,
                y: (start.y * decoded.height) / LOGICAL_HEIGHT,
            };
            const direction = estimateTraceDirection(traceImage, imageStart);
            if (!direction) {
                // Fall back to asking for a direction if the local shape is ambiguous.
                setTraceStart(start);
                return;
            }
            runCurveTrace(start, direction);
            return;
        }

        runCurveTrace(traceStart, { x: x - traceStart.x, y: y - traceStart.y });
    };

    const acceptCurveTrace = () => {
        if (tracePreview.length < 2 || !activeDataset.visible || activeDataset.locked) {
            return;
        }

        // Keep every tenth point for the accepted dataset to reduce rendering
        // and interaction costs, preserving only the two endpoints in addition
        // to the regular decimation interval.
        const acceptedPoints = tracePreview.filter(
            (_, index) => index % 10 === 0 || index === tracePreview.length - 1,
        );

        setDatasets((prev) =>
            prev.map((dataset) =>
                dataset.id === activeDatasetId
                    ? {
                          ...dataset,
                          points: [...dataset.points, ...acceptedPoints],
                      }
                    : dataset,
            ),
        );

        onDirtyChanged(true);
        setSelectedPointRef(null);
        resetTrace();
    };

    // ==================================================
    // Custom Hooks
    // ==================================================

    //
    // GraphInteraction
    // --------------------------------------------------
    const {
        addPoint,
        commitPointDrag,
        commitCalibrationDrag,
        getSelectedPointData,
        handleDeletePoint,
        nudgePoint,
        nudgeCalibrationPoint,
        updateCalibrationValue,
    } = useGraphInteraction({
        datasets,
        setDatasets,
        mode,
        activeDatasetId,
        setActiveDatasetId,
        activeDataset,
        decodedImage: decodedImage.current,
        calibration,
        setCalibration,
        setCalibratedState,
        selectedPointRef,
        setSelectedPointRef,
        fitScale: Math.min(
            displaySize.width / (imageSize?.width ?? 1),
            displaySize.height / (imageSize?.height ?? 1),
        ),
        zoomDisplay,
        nudgeAllPoints,
        onDirtyChanged,
    });

    //
    // ImageManager
    // --------------------------------------------------
    const { fitCurrentImage, setProjectImage, centreView } = useImageManager({
        displaySize,
        setZoomDisplay,
        scale,
        savedScale,
        translateX,
        translateY,
        savedTranslateX,
        savedTranslateY,
        translation,
        imageSize,
        setImageSize,
        setImage,
        setIsRestoringImage,
        zoomDisplay,
    });

    //
    // HistoryState
    // --------------------------------------------------
    const isProcessingProject = isLoadingProject || isRestoringImage;
    const { canUndo, canRedo, handleUndo, handleRedo, resetHistory } = useHistoryState({
        datasets,
        setDatasets,
        calibration,
        setCalibration,
        image,
        setProjectImage,
        onDirtyChanged,
        isProcessingProject,
    });

    //
    // DatasetActions
    // --------------------------------------------------
    const {
        renameDataset,
        setDatasetColour,
        deleteDataset,
        toggleCurveVisibility,
        toggleDatasetVisibility,
        toggleDatasetLock,
    } = useDatasetActions({
        datasets,
        activeDatasetId,
        setDatasets,
        clearSelectedPoint: () => setSelectedPointRef(null),
        setActiveDatasetId,
        onDirtyChanged,
    });

    //
    // ProjectManager
    // --------------------------------------------------

    // Core data entities that are serialized to disk
    const projectPayload = {
        datasets,
        setDatasets,
        calibration,
        setCalibration,
        projectName,
        setProjectName,
        image,
        setProjectImage,
        setProjectCreatedAt,
        setProjectUpdatedAt,
        currentProjectId,
        setCurrentProjectId,
    };

    // Interface preferences saved with the project
    const savedUiPreferences = {
        mode,
        setMode,
        zoomDisplay,
        setZoomDisplay,
        showRegressionLine,
        setShowRegressionLine,
        calibratedState,
        setCalibratedState,
        lastShare,
        setLastShare,
        setWorkspaceTab,
    };

    // UI overlays and coordination lifecycles
    const storageLifecycle = {
        activeDatasetId,
        setActiveDatasetId,
        storageReady,
        setIncomingProject,
        setIsLoadingProject,
        setDialogPayload,
        isDirty,
        onDirtyChanged,
        resetHistory,
        displaySize,
        translation,
    };

    const {
        handleNewProject,
        handleCloseProject,
        handleSave,
        handleSaveAs,
        handleShareProject,
        handleImportProject,
        pickImage,
    } = useProjectManager({
        projectPayload,
        savedUiPreferences,
        storageLifecycle,
    });

    // ==================================================
    // Derived Values
    // ==================================================

    //
    // Data points
    // --------------------------------------------------
    const pointCount = activeDataset?.points?.length || 0;
    const transformedActive = activeDataset.points
        .map((p) => transformPoint(p, calibration))
        .filter((item) => item != null);
    const selectedPointData = getSelectedPointData();
    const graphPoint = selectedPointData ? transformPoint(selectedPointData, calibration) : null;
    const selectedPointIndex = activeDataset?.points?.findIndex(
        (p) => p.id === selectedPointRef?.pointId,
    );
    //
    // Analysis
    // --------------------------------------------------
    const regressionInput = prepareRegressionPoints(transformedActive, calibration);
    const linearFit = linearRegression(regressionInput);
    const predictor = linearFit != null ? getRegressionPredictor(linearFit, calibration) : null;
    const linearR2 = predictor != null ? computeR2(transformedActive, predictor) : null;
    const stats = computeStats(activeDataset?.points || [], calibration);

    // ==================================================
    // Effects
    // ==================================================

    //
    // Storage maintenance
    // --------------------------------------------------
    useEffect(() => {
        async function initializeStorage() {
            try {
                const projects = await loadAllProjects();
                await removeOrphanedImages(projects);
            } catch (error) {
                console.error('Image cleanup failed:', error);
            }
            setStorageReady(true);
        }
        void initializeStorage();
    }, []);

    //
    // Load project
    // --------------------------------------------------
    useEffect(() => {
        if (!incomingProject) return;

        setIsLoadingProject(true);

        setDatasets([]);
        setCalibration(DEFAULT_CALIBRATION);
        setImage(null);

        const hydrated = hydrateProject(incomingProject);

        setCurrentProjectId(hydrated.id || null);
        setProjectName(hydrated.name || 'Untitled Project');
        setProjectCreatedAt(hydrated.createdAt ?? null);
        setProjectUpdatedAt(hydrated.updatedAt ?? null);

        const hydratedOrigin = hydrated.calibration.origin ?? DEFAULT_CALIBRATION.origin;

        const hydratedX = hydrated.calibration.x ?? {
            scaleType: AxisScale.LINEAR,
            p0: null,
            p1: { x: LOGICAL_WIDTH - 10, y: null },
            value0: 0,
            value1: LOGICAL_WIDTH,
        };
        const hydratedY = hydrated.calibration.y ?? {
            scaleType: AxisScale.LINEAR,
            p0: null,
            p1: { x: null, y: 10 },
            value0: 0,
            value1: LOGICAL_HEIGHT,
        };

        const hydratedCalibration = {
            origin: hydratedOrigin,
            x: hydratedX,
            y: hydratedY,
        };
        setCalibration(hydratedCalibration);
        setCalibratedState(hydrated.calibratedState ?? true);
        setDatasets(hydrated.datasets);

        const ui = hydrated.uiState || {};
        const imageUri = hydrated.image;

        const translateX =
            (ui.translateXscaled ?? null) != null ? ui.translateXscaled * displaySize.width : 0;
        const translateY =
            (ui.translateYscaled ?? null) != null ? ui.translateYscaled * displaySize.height : 0;

        setProjectImage(imageUri, ui.zoomDisplay, translateX, translateY);

        const loadedMode = (ui.mode as InteractionMode) || ('points' as InteractionMode);
        setMode(loadedMode);
        setWorkspaceTab(getTabForMode(loadedMode));
        setActiveDatasetId(ui.activeDatasetId || hydrated.datasets?.[0]?.id || null);
        setShowRegressionLine(ui.showRegressionLine || false);
        setLastShare(hydrated.lastShare ?? undefined);

        const baseSnapShotString = {
            datasets: hydrated.datasets,
            calibration: hydratedCalibration,
            image: hydrated.image,
        };

        resetHistory(JSON.stringify(baseSnapShotString));
        setIsLoadingProject(false);
        setIncomingProject(null);
        onDirtyChanged(false);
    }, [
        incomingProject,
        displaySize.width,
        displaySize.height,
        onDirtyChanged,
        setCurrentProjectId,
        setIncomingProject,
        setProjectImage,
        resetHistory,
    ]);

    function getTabForMode(mode: InteractionMode) {
        if (mode === 'calibration') {
            return 'calibrate';
        }

        return 'edit';
    }

    //
    // Load image
    // --------------------------------------------------
    useEffect(() => {
        async function load() {
            decodedImage.current = await loadDecodedImage(image);
        }
        try {
            load();
        } catch (error) {
            console.error('Failed to load image', error);
        }
    }, [image]);

    // ==================================================
    // Helper Functions
    // ==================================================
    function handleRenameDataset() {
        const active = datasets.find((d) => d.id === activeDatasetId);

        if (!active) {
            return;
        }

        setRenameText(active.name);
        setRenameDatasetVisible(true);
    }

    // ==================================================
    // JSX
    // ==================================================

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
                <View style={styles.titleBar}>
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'flex-start',
                        }}
                    >
                        <MenuButton
                            label={projectName}
                            onPress={() => setRenameProjectVisible(true)}
                        />
                    </View>

                    <View style={styles.titleBarActions}>
                        <IconButton icon="save" onPress={handleSave} disabled={!isDirty} />
                        <IconButton icon="open" onPress={onOpenList} />
                        <MenuButton icon="menu" onPress={() => setProjectMenuVisible(true)} />
                    </View>
                </View>

                <View style={styles.toolBar}>
                    <View style={styles.toolBarButton}>
                        <IconButton
                            icon="undo"
                            label="Undo"
                            onPress={handleUndoWithTraceCancel}
                            disabled={!canUndo && tracePhase === 'idle'}
                        />
                    </View>

                    <View style={styles.toolBarButton}>
                        <IconButton
                            icon="redo"
                            label="Redo"
                            onPress={handleRedo}
                            disabled={!canRedo}
                        />
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.toolBarButton}>
                        <IconButton icon="centreImage" label="Centre" onPress={centreView} />
                    </View>

                    <View style={styles.toolBarButton}>
                        <IconButton icon="fit" label="Fit" onPress={fitCurrentImage} />
                    </View>
                </View>

                <View style={styles.canvasArea}>
                    <View style={styles.workspace}>
                        <View style={styles.canvasContainer}>
                            <GraphCanvas
                                image={image}
                                pickImage={pickImage}
                                storageReady={storageReady}
                                datasets={datasets}
                                calibration={calibration}
                                currentMode={mode}

                                activeDatasetId={activeDatasetId}
                                activeDataset={activeDataset}
                                selectedPointRef={selectedPointRef}
                                setSelectedPointRef={setSelectedPointRef}
                                transformedActive={transformedActive}
                                regression={linearFit}
                                showRegressionLine={showRegressionLine}
                                commitPointDrag={commitPointDrag}
                                commitCalibrationDrag={commitCalibrationDrag}
                                addPoint={addPoint}
                                onCanvasTap={handleTraceTap}
                                tracePreview={tracePreview}
                                traceStart={traceStart}

                                scale={scale}
                                translateX={translateX}
                                translateY={translateY}
                                savedScale={savedScale}
                                savedTranslateX={savedTranslateX}
                                savedTranslateY={savedTranslateY}

                                displaySize={displaySize}
                                setViewportSize={setViewportSize}
                                imageSize={imageSize}

                                setZoomDisplay={setZoomDisplay}
                                setTranslation={setTranslation}
                            />
                        </View>

                        <View style={styles.statusBar}>
                            <View
                                style={[
                                    styles.statusBarSection,
                                    {
                                        flex: 2,
                                    },
                                ]}
                            >
                                {mode === 'points' && (
                                    <>
                                        <View style={styles.datasetInfo}>
                                            <View
                                                style={[
                                                    {
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: 3,
                                                        marginRight: 6,
                                                        backgroundColor: activeDataset.colour,
                                                    },
                                                ]}
                                            />

                                            <Text
                                                style={styles.statusText}
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                {activeDataset?.name || 'None'}
                                            </Text>
                                        </View>

                                        {selectedPointIndex ? (
                                            <Text style={styles.statusText}>
                                                Point {selectedPointIndex + 1} / {pointCount}
                                            </Text>
                                        ) : (
                                            <Text style={styles.statusText}>(No selection)</Text>
                                        )}
                                    </>
                                )}

                                {mode === 'calibration' && (
                                    <>
                                        <Text style={styles.statusText}>Calibrate mode</Text>
                                        <Text style={styles.statusText}>
                                            {calibrationSelection === 'origin' && '[Set origin]'}
                                            {calibrationSelection === 'x0' && '[Set X0]'}
                                            {calibrationSelection === 'x1' && '[Set X1]'}
                                            {calibrationSelection === 'y0' && '[Set Y0]'}
                                            {calibrationSelection === 'y1' && '[Set Y1]'}
                                        </Text>
                                    </>
                                )}
                            </View>

                            {mode === 'points' && (
                                <View style={styles.statusBarSection}>
                                    {selectedPointData ? (
                                        <Text style={styles.statusTextCoords}>
                                            X: {graphPoint ? graphPoint.x.toFixed(1) : 'None'}
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X:</Text>
                                    )}

                                    {selectedPointData ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y: {graphPoint ? graphPoint.y.toFixed(1) : 'None'}
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y:</Text>
                                    )}
                                </View>
                            )}

                            {calibrationSelection === 'origin' && (
                                <View style={styles.statusBarSection}>
                                    {calibration.origin ? (
                                        <Text style={styles.statusTextCoords}>
                                            X:{' '}
                                            {calibration.origin.x
                                                ? calibration.origin.x.toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X:</Text>
                                    )}

                                    {calibration.origin ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y:{' '}
                                            {calibration.origin.y
                                                ? (100 - calibration.origin.y).toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y:</Text>
                                    )}
                                </View>
                            )}

                            {calibrationSelection[0] === 'x' && (
                                <View style={styles.statusBarSection}>
                                    {calibration.x.p0 ? (
                                        <Text style={styles.statusTextCoords}>
                                            X0:{' '}
                                            {calibration.x.p0
                                                ? calibration.x.p0.toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X0:</Text>
                                    )}

                                    {calibration.x.p1 ? (
                                        <Text style={styles.statusTextCoords}>
                                            X1: (
                                            {calibration.x.p1
                                                ? (100 - calibration.x.p1).toFixed(1)
                                                : 'None'}
                                            %)
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X1:</Text>
                                    )}
                                </View>
                            )}

                            {calibrationSelection[1] === 'y' && (
                                <View style={styles.statusBarSection}>
                                    {calibration.y.p0 ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y0:{' '}
                                            {calibration.y.p0
                                                ? calibration.y.p0.toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y0:</Text>
                                    )}

                                    {calibration.y.p1 ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y1: (
                                            {calibration.y.p1
                                                ? (100 - calibration.y.p1).toFixed(1)
                                                : 'None'}
                                            %)
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y1:</Text>
                                    )}
                                </View>
                            )}

                            <View
                                style={[
                                    styles.statusBarSection,
                                    {
                                        alignItems: 'flex-end',
                                    },
                                ]}
                            >
                                <View style={styles.statusBarIndicator}>
                                    <AppIcon
                                        name={'notVisible'}
                                        size={14}
                                        colour={
                                            mode === 'points' && !activeDataset.visible
                                                ? COLOURS.alert
                                                : COLOURS.invisible
                                        }
                                    />
                                    <AppIcon
                                        name={'locked'}
                                        size={14}
                                        colour={
                                            mode === 'points' && activeDataset.locked
                                                ? COLOURS.alert
                                                : COLOURS.invisible
                                        }
                                    />
                                </View>
                                <Text style={styles.statusText}>
                                    Zoom:{' '}
                                    {zoomDisplay > 0.1
                                        ? (zoomDisplay * 100).toFixed(0)
                                        : (zoomDisplay * 100).toFixed(1)}
                                    %
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[styles.controlsArea, !image && { borderColor: COLOURS.invisible }]}>
                    {image && (
                        <>
                            <View style={styles.tabBar}>
                                <ScrollView horizontal>
                                    <TabButton
                                        label="Datasets"
                                        onPress={() => {
                                            setWorkspaceTab('datasets');
                                            setMode('points');
                                        }}
                                        active={workspaceTab === 'datasets'}
                                    />
                                    <TabButton
                                        label="Point"
                                        onPress={() => {
                                            setWorkspaceTab('edit');
                                            setMode('points');
                                        }}
                                        active={workspaceTab === 'edit'}
                                    />
                                    <TabButton
                                        label="Trace"
                                        onPress={() => {
                                            setWorkspaceTab('trace');
                                            setMode('points');
                                        }}
                                        active={workspaceTab === 'trace'}
                                    />
                                    <TabButton
                                        label="Calibrate"
                                        onPress={() => {
                                            setWorkspaceTab('calibrate');
                                            setMode('calibration');
                                        }}
                                        active={workspaceTab === 'calibrate'}
                                    />
                                    <TabButton
                                        label="Analysis"
                                        onPress={() => {
                                            setWorkspaceTab('analysis');
                                            setMode('points');
                                        }}
                                        active={workspaceTab === 'analysis'}
                                    />
                                    <TabButton
                                        label="Project"
                                        onPress={() => {
                                            setWorkspaceTab('project');
                                            setMode('points');
                                        }}
                                        active={workspaceTab === 'project'}
                                    />
                                </ScrollView>
                            </View>

                            <View style={styles.workspaceToolContainer}>
                                {workspaceTab === 'project' && (
                                    <ProjectTab
                                        projectName={projectName}
                                        projectCreatedAt={projectCreatedAt}
                                        projectUpdatedAt={projectUpdatedAt}
                                        image={image}
                                        imageSize={imageSize}
                                        pickImage={pickImage}
                                        storageReady={storageReady}
                                        lastShare={lastShare}
                                    />
                                )}

                                {workspaceTab === 'datasets' && (
                                    <DatasetsTab
                                        activeDatasetId={activeDatasetId}
                                        setActiveDatasetId={setActiveDatasetId}
                                        activeDataset={activeDataset}
                                        setDatasets={setDatasets}
                                        datasets={datasets}
                                        onDirtyChanged={onDirtyChanged}
                                        toggleCurveVisibility={toggleCurveVisibility}
                                        toggleDatasetVisibility={toggleDatasetVisibility}
                                        toggleDatasetLock={toggleDatasetLock}
                                        handleDeleteDataset={deleteDataset}
                                        handleRenameDataset={handleRenameDataset}
                                        setColourPickerVisible={setColourPickerVisible}
                                        createDuplicateDataset={createDuplicateDataset}
                                        createEmptyDataset={createEmptyDataset}
                                        setSelectedPointRef={setSelectedPointRef}
                                    />
                                )}

                                {workspaceTab === 'edit' && (
                                    <PointTab
                                        activeDatasetId={activeDatasetId}
                                        activeDataset={activeDataset}
                                        setDatasets={setDatasets}
                                        selectedPointRef={selectedPointRef}
                                        setSelectedPointRef={setSelectedPointRef}
                                        selectedPointIndex={selectedPointIndex}
                                        pointCount={pointCount}
                                        nudgePoint={nudgePoint}
                                        nudgeAllPoints={nudgeAllPoints}
                                        setNudgeAllPoints={setNudgeAllPoints}
                                        handleDeletePoint={handleDeletePoint}
                                        zoomDisplay={zoomDisplay}
                                    />
                                )}

                                {workspaceTab === 'trace' && (
                                    <TraceTab
                                        tracePhase={tracePhase}
                                        onStartTrace={startCurveTrace}
                                        directionMode={traceDirectionMode}
                                        onDirectionModeChange={setTraceDirectionMode}
                                        onCancelTrace={resetTrace}
                                        onAcceptTrace={acceptCurveTrace}
                                        activeDataset={activeDataset}
                                        tracePointCount={tracePreview.length}
                                        hasTraceStart={traceStart !== null}
                                    />
                                )}

                                {workspaceTab === 'analysis' && (
                                    <AnalysisTab
                                        datasets={datasets}
                                        activeDataset={activeDataset}
                                        stats={stats}
                                        linearFit={linearFit}
                                        linearR2={linearR2}
                                        calibration={calibration}
                                        calibratedState={calibratedState}
                                        showRegressionLine={showRegressionLine}
                                        setShowRegressionLine={setShowRegressionLine}
                                        onDirtyChanged={onDirtyChanged}
                                    />
                                )}

                                {workspaceTab === 'calibrate' && (
                                    <CalibrationTab
                                        updateCalibrationValue={updateCalibrationValue}
                                        calibration={calibration}
                                        setCalibration={setCalibration}
                                        calibrationSelection={calibrationSelection}
                                        setCalibrationSelection={setCalibrationSelection}
                                        calibratedState={calibratedState}
                                        setCalibratedState={setCalibratedState}
                                        onDirtyChanged={onDirtyChanged}
                                        nudgeCalibrationPoint={nudgeCalibrationPoint}
                                        zoomDisplay={zoomDisplay}
                                    />
                                )}
                            </View>
                        </>
                    )}
                </View>

                <ColourPickerModal
                    visible={colourPickerVisible}
                    title="Dataset Colour"
                    currentColour={activeDataset?.colour}
                    setDatasetColour={(newColour) => {
                        setDatasetColour(newColour);
                        setColourPickerVisible(false);
                    }}
                    onCancel={() => setColourPickerVisible(false)}
                />

                <TextInputModal
                    visible={renameDatasetVisible}
                    title="Rename Dataset"
                    initialValue={renameText}
                    confirmLabel="Rename"
                    onConfirm={(newName) => {
                        renameDataset(newName);
                        setRenameDatasetVisible(false);
                    }}
                    onCancel={() => setRenameDatasetVisible(false)}
                />

                <TextInputModal
                    visible={renameProjectVisible}
                    title="Rename Project"
                    initialValue={projectName}
                    confirmLabel="Rename"
                    onConfirm={(newName) => {
                        setProjectName(newName);
                        setRenameProjectVisible(false);
                        onDirtyChanged(true);
                    }}
                    onCancel={() => setRenameProjectVisible(false)}
                />

                <TextInputModal
                    visible={saveAsVisible}
                    title="Save As..."
                    initialValue={projectName}
                    confirmLabel="Save"
                    onConfirm={(newName) => {
                        handleSaveAs(newName);
                        setSaveAsVisible(false);
                    }}
                    onCancel={() => setSaveAsVisible(false)}
                />

                {dialogPayload?.type === 'share-confirm' && (
                    <Dialog
                        visible={true}
                        title="Share Project"
                        buttons={[
                            {
                                text: 'Cancel',
                                onPress: () =>
                                    setDialogPayload({
                                        type: null,
                                    }),
                            },
                            {
                                text: 'Upload',
                                onPress: () => {
                                    handleShareProject();
                                    setDialogPayload({
                                        type: 'share-progress',
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={styles.paragraph}>
                            This project will be uploaded to the app's sharing service.
                        </Text>

                        <Text style={styles.paragraph}>
                            Anyone with the share ID will be able to import a copy of the project.
                        </Text>

                        <Text style={styles.paragraph}>
                            Shared projects are intended for temporary sharing and should not be
                            relied upon for long-term storage.
                        </Text>
                    </Dialog>
                )}

                {dialogPayload?.type === 'share-progress' && (
                    <Dialog visible={true} title="Uploading project...">
                        <View
                            style={{
                                marginBottom: 16,
                            }}
                        >
                            <ActivityIndicator size="large" />
                        </View>

                        <Text>Please wait a moment.</Text>
                    </Dialog>
                )}

                {dialogPayload?.type === 'share-success' && (
                    <Dialog
                        visible={true}
                        title="Project shared"
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialogPayload({
                                        type: null,
                                    });
                                },
                            },
                            {
                                text: justCopied ? 'Copied!' : 'Copy ID',
                                onPress: async () => {
                                    if (dialogPayload.shareResponse?.shareId) {
                                        await Clipboard.setStringAsync(
                                            dialogPayload.shareResponse.shareId,
                                        );
                                        setJustCopied(true);

                                        setTimeout(() => {
                                            setJustCopied(false);
                                        }, 2000);
                                    }
                                },
                            },
                        ]}
                    >
                        <Text style={styles.paragraph}>Share ID:</Text>
                        <Text style={styles.sectionTitle}>
                            {dialogPayload.shareResponse?.shareId ?? '(Error)'}
                        </Text>
                    </Dialog>
                )}

                {dialogPayload?.type === 'import-input' && (
                    <TextInputModal
                        visible={true}
                        title="Enter the Share ID:"
                        initialValue={''}
                        confirmLabel="Import"
                        onConfirm={(shareId) => {
                            handleImportProject(shareId);
                            setDialogPayload({
                                type: 'import-progress',
                            });
                        }}
                        onCancel={() =>
                            setDialogPayload({
                                type: null,
                            })
                        }
                        message="The project will be downloaded from the sharing service, saved as a new local project and opened in the editor."
                    />
                )}

                {dialogPayload?.type === 'import-progress' && (
                    <Dialog visible={true} title="Downloading project...">
                        <View
                            style={{
                                marginBottom: 16,
                            }}
                        >
                            <ActivityIndicator size="large" />
                        </View>

                        <Text>Please wait a moment.</Text>
                    </Dialog>
                )}

                {dialogPayload?.type === 'import-success' && (
                    <Dialog
                        visible={true}
                        title="Download complete"
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialogPayload({
                                        type: null,
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={styles.statusText}>Project:</Text>
                        <Text style={styles.paragraph}>"{dialogPayload.name || '(No name)'}"</Text>
                    </Dialog>
                )}

                {dialogPayload?.type === 'error' && (
                    <Dialog
                        visible={true}
                        title={dialogPayload.title ?? 'Error'}
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialogPayload({
                                        type: null,
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={styles.paragraph}>{dialogPayload.message}</Text>
                    </Dialog>
                )}

                {showHelp && <HelpModal visible={true} onClose={() => setShowHelp(false)} />}

                <ProjectMenuModal
                    visible={projectMenuVisible}
                    handleSave={() => {
                        handleSave();
                        setProjectMenuVisible(false);
                    }}
                    handleSaveAs={() => {
                        setSaveAsVisible(true);
                        setProjectMenuVisible(false);
                    }}
                    handleRenameProject={() => {
                        setRenameProjectVisible(true);
                        setProjectMenuVisible(false);
                    }}
                    handleCloseProject={() => {
                        resetTrace();
                        handleCloseProject();
                        setProjectMenuVisible(false);
                    }}
                    handleNewProject={() => {
                        resetTrace();
                        handleNewProject();
                        setProjectMenuVisible(false);
                    }}
                    handleShareProject={() => {
                        setDialogPayload({
                            type: 'share-confirm',
                        });
                        setProjectMenuVisible(false);
                    }}
                    handleShowHelp={() => {
                        setShowHelp(true);
                        setProjectMenuVisible(false);
                    }}
                    handleImportProject={() => {
                        resetTrace();
                        setProjectMenuVisible(false);
                        if (isDirty) {
                            Alert.alert('Unsaved Changes', 'Discard current project changes?', [
                                {
                                    text: 'Cancel',
                                    style: 'cancel',
                                },
                                {
                                    text: 'Discard',
                                    style: 'destructive',
                                    onPress: () => {
                                        setDialogPayload({
                                            type: 'import-input',
                                        });
                                    },
                                },
                            ]);

                            return;
                        } else {
                            setDialogPayload({
                                type: 'import-input',
                            });
                        }
                    }}
                    onCancel={() => setProjectMenuVisible(false)}
                />
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLOURS.background,
    },

    titleBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLOURS.border,
        backgroundColor: COLOURS.surface,
    },

    titleBarActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 0,
        borderBottomWidth: 1,
        borderBottomColor: COLOURS.border,
        backgroundColor: COLOURS.surface,
    },

    toolBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLOURS.border,
        backgroundColor: COLOURS.surface,
    },

    controlsArea: {
        flex: 4,
        backgroundColor: COLOURS.surfaceToolsContainer,
        borderColor: COLOURS.toolsContainerBorder,
        borderWidth: 3,
    },

    canvasArea: {
        flex: 6,
        justifyContent: 'center',
    },

    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        borderColor: COLOURS.border,
    },

    workspaceToolContainer: {
        flex: 1,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderColor: COLOURS.border,
    },

    datasetInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 2,
    },

    controls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },

    input: {
        borderWidth: 1,
        padding: 5,
        width: 60,
    },

    sectionTitle: {
        ...TYPOGRAPHY.section,
        color: COLOURS.text,
    },

    workspace: {
        flex: 1,
    },

    canvasContainer: {
        flex: 1,
        borderRadius: RADIUS.sm,
    },

    toolBarButton: {
        flex: 1,
    },

    separator: {
        width: 1,
        alignSelf: 'stretch',
        backgroundColor: '#d7d7d7',
        marginHorizontal: 8,
        marginVertical: 8,
    },

    statusBar: {
        flexDirection: 'row',
        backgroundColor: COLOURS.surfaceAlt,
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLOURS.border,
    },

    statusBarSection: {
        flex: 1,
        alignItems: 'flex-start',
        ...TYPOGRAPHY.small,
        color: COLOURS.muted,
    },

    statusText: {
        flexShrink: 1,
        ...TYPOGRAPHY.small,
        color: COLOURS.muted,
    },

    statusTextCoords: {
        ...TYPOGRAPHY.small,
        fontFamily: 'monospace',
        color: COLOURS.muted,
        marginRight: SPACING.lg,
    },

    statusBarIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },

    paragraph: {
        marginVertical: 4,
    },
});
