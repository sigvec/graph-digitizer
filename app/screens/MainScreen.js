import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';

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
import GraphCanvas from '../components/GraphCanvas';
import CalibrationTab from '../components/Tabs/CalibrationTab';
import AnalysisTab from '../components/Tabs/AnalysisTab';
import ProjectTab from '../components/Tabs/ProjectTab';
import PointTab from '../components/Tabs/PointTab';
import DatasetsTab from '../components/Tabs/DatasetsTab';
import { TextInputModal, ProjectMenuModal, ColourPickerModal, Dialog } from '../components/Modals';
import HelpModal from '../components/HelpModal';

import { transformPoint, getRegressionPredictor } from '../calibration/transform';
import { linearRegression, computeR2 } from '../analysis/regression';
import { prepareRegressionPoints } from '../analysis/prepareRegressionPoints';
import { loadAllProjects } from '../../frontend/services/storage/localStorage';
import { removeOrphanedImages } from '../../frontend/services/storage/imageStorage';
import { hydrateProject } from '../utils/projectTransform';
import { loadDecodedImage } from '../../frontend/services/imageAnalysis/imageLoader';

import { useHistoryState } from '../hooks/useHistoryState';
import { useGraphInteraction } from '../hooks/useGraphInteraction';
import { useDatasetState, createEmptyDataset } from '../hooks/useDatasetState';
import { useProjectManager } from '../hooks/useProjectManager';

function getImageSize(uri) {
    return new Promise((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
}

export default function MainScreen({
    currentProjectId,
    setCurrentProjectId,
    onOpenList,
    incomingProject,
    setIncomingProject,
    isDirty,
    onDirtyChanged,
}) {
    // ==================================================
    // State
    // ==================================================

    const [projectName, setProjectName] = useState('Untitled Project');
    const [projectCreatedAt, setProjectCreatedAt] = useState(null);
    const [projectUpdatedAt, setProjectUpdatedAt] = useState(null);
    const [projectMenuVisible, setProjectMenuVisible] = useState(false);
    const [colourPickerVisible, setColourPickerVisible] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [justCopied, setJustCopied] = useState(null);
    const [image, setImage] = useState(null);
    const [zoomDisplay, setZoomDisplay] = useState(1);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [imageWidth, setImageWidth] = useState(null);
    const [imageHeight, setImageHeight] = useState(null);
    const [selectedPointRef, setSelectedPointRef] = useState(null);
    const [datasets, setDatasets] = useState([createEmptyDataset(0)]);
    const [activeDatasetId, setActiveDatasetId] = useState(datasets[0].id);
    const [mode, setMode] = useState('points');
    const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);
    const [calibratedState, setCalibratedState] = useState(false);
    const [renameDatasetVisible, setRenameDatasetVisible] = useState(false);
    const [renameText, setRenameText] = useState('');
    const [renameProjectVisible, setRenameProjectVisible] = useState(false);
    const [saveAsVisible, setSaveAsVisible] = useState(false);
    const [workspaceTab, setWorkspaceTab] = useState('edit');
    const [nudgeAllPoints, setNudgeAllPoints] = useState(false);
    const [showRegressionLine, setShowRegressionLine] = useState(false);
    const [lastShare, setLastShare] = useState(undefined);
    const [storageReady, setStorageReady] = useState(false);
    const [isLoadingProject, setIsLoadingProject] = useState(false);
    const [isRestoringImage, setIsRestoringImage] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // ==================================================
    // Refs / Shared Values
    // ==================================================

    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    const decodedImage = useRef(null);

    const getScaledTranslations = () => {
        const width = Math.max(0, viewportSize.width - DISPLAY_PADDING * 2);
        const height = Math.max(0, viewportSize.height - DISPLAY_PADDING * 2);

        return {
            translateXscaled: width > 0 ? translateX.value / width : 0,
            translateYscaled: height > 0 ? translateY.value / height : 0,
        };
    };

    const displaySize = {
        width: Math.max(0, viewportSize.width - DISPLAY_PADDING * 2),
        height: Math.max(0, viewportSize.height - DISPLAY_PADDING * 2),
    };

    const setProjectImage = useCallback(
        async (uri, zoom, xTranslation, yTranslation) => {
            setIsRestoringImage(true);

            try {
                if (typeof uri !== 'string' || uri.length === 0) {
                    setImage(null);
                    setImageWidth(null);
                    setImageHeight(null);
                    return;
                }

                const { width, height } = await getImageSize(uri);

                setImageWidth(width);
                setImageHeight(height);
                setImage(uri);

                if (Number.isFinite(zoom)) {
                    fitImage(width, height, Math.abs(zoom), xTranslation, yTranslation);
                } else {
                    const fitScale = Math.min(
                        displaySize.width / width,
                        displaySize.height / height,
                    );

                    const finalScale = zoomDisplay * fitScale;

                    scale.value = finalScale;
                    savedScale.value = finalScale;
                }
            } catch (error) {
                console.warn('Failed to load image:', error);

                setImage(null);
                setImageWidth(null);
                setImageHeight(null);
            } finally {
                setIsRestoringImage(false);
            }
        },
        [displaySize.width, displaySize.height, fitImage, zoomDisplay, scale, savedScale],
    );

    const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0];

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
        fitScale: Math.min(displaySize.width / imageWidth, displaySize.height / imageHeight),
        zoomDisplay,
        nudgeAllPoints,
        onDirtyChanged,
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
    // DatasetState
    // --------------------------------------------------
    const {
        handleRenameDataset,
        confirmRenameDataset,
        setDatasetColour,
        handleDeleteDataset,
        createDuplicateDataset,
        toggleCurveVisibility,
        toggleDatasetVisibility,
        toggleDatasetLock,
    } = useDatasetState({
        datasets,
        setDatasets,
        activeDatasetId,
        setActiveDatasetId,
        setSelectedPointRef,
        createEmptyDataset,
        setRenameDatasetVisible,
        setRenameText,
        setColourPickerVisible,
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
        setDialog,
        isDirty,
        onDirtyChanged,
        resetHistory,
        getScaledTranslations,
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

    const selectedPointIndex =
        activeDataset?.points?.findIndex((p) => p.id === selectedPointRef?.pointId) || null;
    const pointCount = activeDataset?.points?.length || 0;
    const transformedActive = activeDataset.points
        .map((p) => transformPoint(p, calibration))
        .filter(Boolean);
    const regressionInput = prepareRegressionPoints(transformedActive, calibration);
    const linearFit = linearRegression(regressionInput);
    const predictor = getRegressionPredictor(linearFit, calibration);
    const linearR2 = linearFit ? computeR2(transformedActive, predictor) : null;
    const stats = computeStats(activeDataset?.points || []);
    const selectedPointData = getSelectedPointData();
    const graphPoint = selectedPointData ? transformPoint(selectedPointData, calibration) : null;

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

    function getTabForMode(mode) {
        if (mode === 'origin' || mode === 'xRef' || mode === 'yRef') {
            return 'calibrate';
        }

        return 'edit';
    }

    //
    // Load project
    // --------------------------------------------------
    useEffect(() => {
        if (!incomingProject) return;

        setIsLoadingProject(true);

        setDatasets(null);
        setCalibration(null);
        setImage(null);

        const hydrated = hydrateProject(incomingProject);

        setCurrentProjectId(hydrated.id || null);
        setProjectName(hydrated.name || 'Untitled Project');
        setProjectCreatedAt(hydrated.createdAt ?? null);
        setProjectUpdatedAt(hydrated.updatedAt ?? null);

        const hydratedOrigin = hydrated.calibration.origin ?? DEFAULT_CALIBRATION.origin;
        const hydratedXref = hydrated.calibration.xRef ?? { x: LOGICAL_WIDTH - 10, y: null };
        const hydratedYref = hydrated.calibration.yRef ?? { x: null, y: 10 };
        const hydratedX = hydrated.calibration.x ?? {
            scaleType: AxisScale.LINEAR,
            p0: null,
            p1: hydratedXref.x,
            value0: hydrated.axes?.x1 ?? 0,
            value1: hydrated.axes?.x2 ?? LOGICAL_WIDTH,
        };
        const hydratedY = hydrated.calibration.y ?? {
            scaleType: AxisScale.LINEAR,
            p0: null,
            p1: hydratedYref.y,
            value0: hydrated.axes?.y1 ?? 0,
            value1: hydrated.axes?.y2 ?? LOGICAL_HEIGHT,
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
            (ui.translateXscaled ?? null) != null
                ? ui.translateXscaled * displaySize.width
                : ui.translateX;
        const translateY =
            (ui.translateYscaled ?? null) != null
                ? ui.translateYscaled * displaySize.height
                : ui.translateY;

        setProjectImage(imageUri, ui.zoomDisplay, translateX, translateY);

        const loadedMode = ui.mode || 'points';
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

    //
    // Stats
    // --------------------------------------------------
    function computeStats(points) {
        if (!points.length) return null;

        const transformed = points.map((p) => transformPoint(p, calibration)).filter(Boolean) || [];
        const xs = transformed.map((p) => p.x);
        const ys = transformed.map((p) => p.y);

        return {
            count: points.length,
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
        };
    }

    //
    // UI
    // --------------------------------------------------
    function centreView() {
        translateX.value = 0;
        translateY.value = 0;

        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    }

    const fitImage = useCallback(
        (imgWidth, imgHeight, newZoom, newXTranslation, newYTranslation) => {
            if (
                displaySize.width === 0 ||
                displaySize.height === 0 ||
                imgWidth === 0 ||
                imgHeight === 0
            ) {
                return;
            }

            const fitScale = Math.min(displaySize.width / imgWidth, displaySize.height / imgHeight);

            const finalZoom = newZoom ?? 1;
            const finalScale = finalZoom * fitScale;

            setZoomDisplay(finalZoom);

            scale.value = finalScale;
            savedScale.value = finalScale;

            const finalXTranslation = newXTranslation ?? 0;
            const finalYTranslation = newYTranslation ?? 0;

            translateX.value = finalXTranslation;
            translateY.value = finalYTranslation;

            savedTranslateX.value = finalXTranslation;
            savedTranslateY.value = finalYTranslation;
        },
        [
            displaySize.width,
            displaySize.height,
            scale,
            savedScale,
            translateX,
            translateY,
            savedTranslateX,
            savedTranslateY,
        ],
    );

    function fitCurrentImage() {
        fitImage(imageWidth, imageHeight);
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
                        <MenuButton
                            icon="menu"
                            onPress={() => setProjectMenuVisible(true)}
                            disabled={!isDirty}
                        />
                    </View>
                </View>

                <View style={styles.toolBar}>
                    <View style={styles.toolBarButton}>
                        <IconButton
                            icon="undo"
                            label="Undo"
                            onPress={handleUndo}
                            disabled={!canUndo}
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
                                selectedPointRef={selectedPointRef}
                                transformedActive={transformedActive}
                                regression={linearFit}
                                showRegressionLine={showRegressionLine}
                                setSelectedPointRef={setSelectedPointRef}
                                commitPointDrag={commitPointDrag}
                                commitCalibrationDrag={commitCalibrationDrag}
                                addPoint={addPoint}

                                scale={scale}
                                translateX={translateX}
                                translateY={translateY}
                                savedScale={savedScale}
                                savedTranslateX={savedTranslateX}
                                savedTranslateY={savedTranslateY}

                                displaySize={displaySize}
                                imageHeight={imageHeight}
                                setViewportSize={setViewportSize}
                                imageWidth={imageWidth}

                                setZoomDisplay={setZoomDisplay}
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

                                        {selectedPointData ? (
                                            <Text style={styles.statusText}>
                                                Point {selectedPointIndex + 1} / {pointCount}
                                            </Text>
                                        ) : (
                                            <Text style={styles.statusText}>(No selection)</Text>
                                        )}
                                    </>
                                )}

                                {mode !== 'points' && (
                                    <>
                                        <Text style={styles.statusText}>Calibrate mode</Text>
                                        <Text style={styles.statusText}>
                                            {mode === 'origin' && '[Set origin]'}
                                            {mode === 'xRef' && '[Set X reference]'}
                                            {mode === 'yRef' && '[Set Y reference]'}
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

                            {mode === 'origin' && (
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

                            {mode === 'xRef' && (
                                <View style={styles.statusBarSection}>
                                    {calibration.xRef ? (
                                        <Text style={styles.statusTextCoords}>
                                            X:{' '}
                                            {calibration.xRef.x
                                                ? calibration.xRef.x.toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X:</Text>
                                    )}

                                    {calibration.xRef ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y: (
                                            {calibration.xRef.y
                                                ? (100 - calibration.xRef.y).toFixed(1)
                                                : 'None'}
                                            %)
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y:</Text>
                                    )}
                                </View>
                            )}

                            {mode === 'yRef' && (
                                <View style={styles.statusBarSection}>
                                    {calibration.yRef ? (
                                        <Text style={styles.statusTextCoords}>
                                            X: (
                                            {calibration.yRef.x
                                                ? calibration.yRef.x.toFixed(1)
                                                : 'None'}
                                            %)
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>X:</Text>
                                    )}

                                    {calibration.yRef ? (
                                        <Text style={styles.statusTextCoords}>
                                            Y:{' '}
                                            {calibration.yRef.y
                                                ? (100 - calibration.yRef.y).toFixed(1)
                                                : 'None'}
                                            %
                                        </Text>
                                    ) : (
                                        <Text style={styles.statusTextCoords}>Y:</Text>
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
                                        label="Calibrate"
                                        onPress={() => {
                                            setWorkspaceTab('calibrate');
                                            setMode('origin');
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
                                        imageWidth={imageWidth}
                                        imageHeight={imageHeight}
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
                                        handleDeleteDataset={handleDeleteDataset}
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
                                        selectedPointData={selectedPointData}
                                        pointCount={pointCount}
                                        nudgePoint={nudgePoint}
                                        nudgeAllPoints={nudgeAllPoints}
                                        setNudgeAllPoints={setNudgeAllPoints}
                                        handleDeletePoint={handleDeletePoint}
                                        zoomDisplay={zoomDisplay}
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
                                        mode={mode}
                                        setMode={setMode}
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
                        confirmRenameDataset(newName);
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

                {dialog?.type === 'share-confirm' && (
                    <Dialog
                        visible={true}
                        title="Share Project"
                        buttons={[
                            {
                                text: 'Cancel',
                                onPress: () =>
                                    setDialog({
                                        type: null,
                                    }),
                            },
                            {
                                text: 'Upload',
                                onPress: () => {
                                    handleShareProject();
                                    setDialog({
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

                {dialog?.type === 'share-progress' && (
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

                {dialog?.type === 'share-success' && (
                    <Dialog
                        visible={true}
                        title="Project shared"
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialog({
                                        type: null,
                                    });
                                },
                            },
                            {
                                text: justCopied ? 'Copied!' : 'Copy ID',
                                onPress: async () => {
                                    await Clipboard.setStringAsync(dialog.share.shareId);
                                    setJustCopied(true);

                                    setTimeout(() => {
                                        setJustCopied(false);
                                    }, 2000);
                                },
                            },
                        ]}
                    >
                        <Text style={styles.paragraph}>Share ID:</Text>
                        <Text style={styles.sectionTitle}>{dialog.share.shareId}</Text>
                    </Dialog>
                )}

                {dialog?.type === 'import-input' && (
                    <TextInputModal
                        visible={true}
                        title="Enter the Share ID:"
                        initialValue={''}
                        confirmLabel="Import"
                        onConfirm={(shareId) => {
                            handleImportProject(shareId);
                            setDialog({
                                type: 'import-progress',
                            });
                        }}
                        onCancel={() =>
                            setDialog({
                                type: null,
                            })
                        }
                        message="The project will be downloaded from the sharing service, saved as a new local project and opened in the editor."
                    />
                )}

                {dialog?.type === 'import-progress' && (
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

                {dialog?.type === 'import-success' && (
                    <Dialog
                        visible={true}
                        title="Download complete"
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialog({
                                        type: null,
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={styles.statusText}>Project:</Text>
                        <Text style={styles.paragraph}>"{dialog.name || '(No name)'}"</Text>
                    </Dialog>
                )}

                {dialog?.type === 'error' && (
                    <Dialog
                        visible={true}
                        title={dialog.title}
                        buttons={[
                            {
                                text: 'Close',
                                onPress: () => {
                                    setDialog({
                                        type: null,
                                    });
                                },
                            },
                        ]}
                    >
                        <Text style={styles.paragraph}>{dialog.message}</Text>
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
                        handleCloseProject(true);
                        setProjectMenuVisible(false);
                    }}
                    handleNewProject={() => {
                        handleNewProject();
                        setProjectMenuVisible(false);
                    }}
                    handleShareProject={() => {
                        setDialog({
                            type: 'share-confirm',
                        });
                        setProjectMenuVisible(false);
                    }}
                    handleShowHelp={() => {
                        setShowHelp(true);
                        setProjectMenuVisible(false);
                    }}
                    handleImportProject={() => {
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
                                        setDialog({
                                            type: 'import-input',
                                        });
                                    },
                                },
                            ]);

                            return;
                        } else {
                            setDialog({
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
        backgroundColor: COLOURS.surfaceTools,
    },

    workspaceToolContainer: {
        flex: 1,
        paddingHorizontal: 8,
        backgroundColor: COLOURS.surfaceToolsContiner,
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
