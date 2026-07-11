import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator
} from "react-native";

import {
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Clipboard from "expo-clipboard";
import { useSharedValue } from "react-native-reanimated";

import {
  DATASET_COLOURS,
} from '../constants/colours';

import AppIcon from '../components/AppIcon';
import IconButton from '../components/IconButton';
import { DatasetActionButton } from '../components/IconButton';
import MenuButton from '../components/MenuButton';
import TabButton from '../components/TabButton';

import { transformPoint } from '../calibration/transform'
import { linearRegression, computeR2 } from '../analysis/regression'
import { prepareRegressionPoints } from "../analysis/prepareRegressionPoints";
import { getRegressionPredictor } from "../calibration/transform";

import * as ImagePicker from "expo-image-picker";

import { SafeAreaView } from 'react-native-safe-area-context';

import { generateId } from '../utils/id';

import storage from '../../frontend/services/storage';
import { loadAllProjects } from "../../frontend/services/storage/localStorage";
import { copyToLocal, removeOrphanedImages } from "../../frontend/services/storage/imageStorage";
import { hydrateProject } from '../utils/projectTransform';
import { shareProject } from '../../frontend/services/sharing/shareProject'
import { importProject } from "../../frontend/services/sharing/importProject";

import GraphCanvas from '../components/GraphCanvas';
import CalibrationTab from '../components/Tabs/CalibrationTab';
import AnalysisTab from '../components/Tabs/AnalysisTab';
import ProjectTab from '../components/Tabs/ProjectTab';

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../constants/geometry';
import { AxisScale } from "../calibration/constants";

import { TextInputModal, ProjectMenuModal, ColourPickerModal, Dialog } from '../components/Modals';

import Constants from "expo-constants";

const APP_VERSION = Constants.expoConfig?.version ?? "0.3.1";
const PROJECT_FORMAT_VERSION = 1;

export default function MainScreen({ onOpenList, loadedProject, setLoadedProject, dirty, setDirty }) {

  const DISPLAY_PADDING = SPACING.xs;
  const DEFAULT_CALIBRATION = {
    origin: { x: 10, y: LOGICAL_HEIGHT - 10 },
    x: { scaleType: AxisScale.LINEAR, p0: null, p1: LOGICAL_WIDTH - 10, value0: 0, value1: LOGICAL_WIDTH, units: "units" },
    y: { scaleType: AxisScale.LINEAR, p0: null, p1: 10, value0: 0, value1: LOGICAL_HEIGHT, units: "units" },
  };

  // ==================================================
  // State
  // ==================================================

  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectCreatedAt, setProjectCreatedAt] = useState(null);
  const [projectUpdatedAt, setProjectUpdatedAt] = useState(null);
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);
  const [colourPickerVisible, setColourPickerVisible] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [justCopied, setJustCopied] = useState(null);
  const [image, setImage] = useState(null);
  const [zoomDisplay, setZoomDisplay] = useState(1);
  const [viewportSize, setViewportSize] =
    useState({
      width: 0,
      height: 0,
    });
  const [imageWidth, setImageWidth] = useState(null);
  const [imageHeight, setImageHeight] = useState(null);
  const [selectedPointRef, setSelectedPointRef] = useState(null);
  const [datasets, setDatasets] = useState([createEmptyDataset(0)]);
  const [activeDatasetId, setActiveDatasetId] = useState(datasets[0].id);
  const [mode, setMode] = useState("points");
  const [calibration, setCalibration] = useState(DEFAULT_CALIBRATION);
  const [calibratedState, setCalibratedState] = useState(false);
  const [renameDatasetVisible, setRenameDatasetVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renameProjectVisible, setRenameProjectVisible] = useState(false);
  const [saveAsVisible, setSaveAsVisible] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('edit');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [nudgeAllPoints, setNudgeAllPoints] = useState(false);
  const [showRegressionLine, setShowRegressionLine] = useState(false);

  const [storageReady, setStorageReady] = useState(false);

  const [isRestoringHistory, setIsRestoringHistory] = useState(false);
  const [isRestoringImage, setIsRestoringImage] = useState(false);
  // ==================================================
  // Refs / Shared Values
  // ==================================================

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const shareBusy = useRef(false);
  const networkTimedOut = useRef(false);

  // ==================================================
  // Derived Values
  // ==================================================

  const displaySize = {
    width: Math.max(
      0,
      viewportSize.width - DISPLAY_PADDING * 2
    ),
    height: Math.max(
      0,
      viewportSize.height - DISPLAY_PADDING * 2
    ),
  };

  const activeDataset = datasets.find(d => d.id === activeDatasetId) || datasets[0];

  const currentSnapshot = {
    datasets,
    calibration,
    image,
  };
  const snapshotString = JSON.stringify(currentSnapshot);

  const selectedPointIndex =
    activeDataset?.points?.findIndex(
      p => p.id === selectedPointRef?.pointId
    ) || null;

  const selectedPointData = getSelectedPointData()

  const graphPoint = selectedPointData
    ? transformPoint(selectedPointData, calibration)
    : null;

  const pointCount = activeDataset?.points?.length || 0;

  const transformedActive = activeDataset.points
    .map(p => transformPoint(p, calibration))
    .filter(Boolean);

  const regressionInput = prepareRegressionPoints(transformedActive, calibration);

  const linearFit = linearRegression(regressionInput);

  const predictor = getRegressionPredictor(linearFit, calibration)
  const linearR2 = linearFit
    ? computeR2(transformedActive, predictor)
    : null;

  const stats = computeStats(activeDataset?.points || []);

  // ==================================================
  // Effects
  // ==================================================

  useEffect(() => {

    async function initializeStorage() {
      try {
        const projects = await loadAllProjects()
        await removeOrphanedImages(projects);
      } catch (error) {
        console.error("Image cleanup failed:", error);
      }

      setStorageReady(true);

    }

    void initializeStorage();
  }, []);

  useEffect(() => {
    if (!loadedProject) return;

    setIsRestoringHistory(true);

    const hydrated = hydrateProject(loadedProject);

    setCurrentProjectId(hydrated.id || null);

    setProjectName(
      hydrated.name || 'Untitled Project'
    );

    setProjectCreatedAt(hydrated.createdAt ?? null);
    setProjectUpdatedAt(hydrated.updatedAt ?? null);

    const hydratedOrigin = hydrated.calibration.origin ?? DEFAULT_CALIBRATION.origin
    const hydratedXref = hydrated.calibration.xRef ?? { x: LOGICAL_WIDTH - 10, y: null }
    const hydratedYref = hydrated.calibration.yRef ?? { x: null, y: 10 }

    const hydratedX = hydrated.calibration.x ?? {
      scaleType: AxisScale.LINEAR, p0: null, p1: hydratedXref.x, value0: hydrated.axes?.x1 ?? 0, value1: hydrated.axes?.x2 ?? LOGICAL_WIDTH
    }
    const hydratedY = hydrated.calibration.y ?? {
      scaleType: AxisScale.LINEAR, p0: null, p1: hydratedYref.y, value0: hydrated.axes?.y1 ?? 0, value1: hydrated.axes?.y2 ?? LOGICAL_HEIGHT
    }

    const hydratedCalibration = {
      origin: hydratedOrigin,
      x: hydratedX,
      y: hydratedY,
    }
    setCalibration(hydratedCalibration);
    setCalibratedState(hydrated.calibratedState ?? true);

    setDatasets(hydrated.datasets);
    setActiveDatasetId(hydrated.datasets?.[0]?.id || null);

    const ui = hydrated.uiState || {};

    const imageUri = hydrated.image;

    const translateX = ui.translateXscaled * displaySize.width || ui.translateX
    const translateY = ui.translateYscaled * displaySize.height || ui.translateY

    setIsRestoringImage(true)
    setProjectImage(imageUri, ui.zoomDisplay, translateX, translateY);

    const loadedMode = ui.mode || 'points'
    setMode(loadedMode);

    setWorkspaceTab(
      getTabForMode(loadedMode)
    );

    setActiveDatasetId(
      ui.activeDatasetId ||
      hydrated.datasets?.[0]?.id ||
      null
    );

    setShowRegressionLine(ui.showRegressionLine || false)

    const snapshot = {
      datasets: hydrated.datasets,
      calibration: hydratedCalibration,
      image: hydrated.image,
    };

    setHistory([JSON.stringify(snapshot)]);
    setHistoryIndex(0);

    setIsRestoringHistory(false);

    setLoadedProject(null)

    setDirty(false);

  }, [loadedProject]);


  useEffect(() => {

    if (isRestoringHistory || isRestoringImage) {
      return;
    }

    commitHistorySnapshot(snapshotString)

  }, [snapshotString]);

  // ==================================================
  // Helper Functions
  // ==================================================


  //
  // File
  // --------------------------------------------------

  function getFilename(uri) {
    return uri.split('/').pop();
  }

  function resetWorkspace() {

    setCurrentProjectId(null);

    setProjectName('Untitled Project');

    const newDataset = createEmptyDataset(0)
    const newDatasetId = newDataset.id
    setProjectImage(null)

    setDatasets([
      newDataset
    ]);

    setActiveDatasetId(newDatasetId)


    setCalibration(
      DEFAULT_CALIBRATION
    );

    setCalibratedState(false);

    setZoomDisplay(1);

    setWorkspaceTab('edit')
    setMode('points')

    setShowRegressionLine(false)

    setHistory([]);
    setHistoryIndex(0);
    setDirty(false);
  }

  function handleNewProject() {

    if (dirty) {

      Alert.alert(
        'Unsaved Changes',
        'Discard current project changes?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: resetWorkspace,
          },
        ]
      );

      return;
    }

    resetWorkspace();
  }

  function handleCloseProject() {
    handleNewProject();
  }

  async function handleSave() {

    try {
      const finalName = projectName.trim() || 'Untitled Project';
      const project = buildFullProjectExport(
        datasets,
        finalName,
      );

      if (currentProjectId) {
        const result = await storage.updateProject(
          currentProjectId,
          project
        );

        setProjectCreatedAt(result.createdAt);
        setProjectUpdatedAt(result.updatedAt);

      } else {
        const result = await storage.saveProject(project);

        setCurrentProjectId(result.id);
        setProjectCreatedAt(result.createdAt);
        setProjectUpdatedAt(result.updatedAt);

      }

      setDirty(false);

    } catch (err) {
      console.error(err);
    }
  }


  async function handleSaveAs(newName, inputProject) {

    try {
      const finalName = newName.trim() || 'Untitled Project';

      const projectToSave = inputProject ?? buildFullProjectExport(
        datasets,
        finalName,
      );

      const result = await storage.saveProject(projectToSave);
      setCurrentProjectId(result.id);
      setProjectName(finalName);
      setProjectCreatedAt(result.createdAt);
      setProjectUpdatedAt(result.updatedAt);

      setDirty(false);

      return result;

    } catch (err) {
      console.error(err);
    }
  }

  async function handleShareProject() {
    const finalName = projectName.trim() || 'Untitled Project';
    const project = buildFullProjectExport(
      datasets,
      finalName,
    );

    if (shareBusy.current) {
      return;
    }

    shareBusy.current = true;

    const controller = new AbortController();
    networkTimedOut.current = false;

    const timeout = setTimeout(() => {
      networkTimedOut.current = true;
      controller.abort();
    }, 30000);

    try {

      const share = await shareProject(project, controller.signal);

      setDialog({
        type: "share-success",
        share: share
      });
    } catch (err) {
      let message = "Unable to connect to the sharing service. Please check your internet connection and try again."

      switch (err.message) {

        case "TOO_BIG":
          message = "This project is too large to be shared. Try reducing the image resolution before sharing."
          console.warn(err)
          break;

        case "REQUESTED_ABORT":
          if (networkTimedOut.current) {
            message = "The request timed out. Please check your internet connection and try again."
          } else {
            message = "Upload cancelled."
          }
          console.warn(err)
          break;

        case "NETWORK":
          message = "Unable to connect to the sharing service. Please check your internet connection and try again."
          console.warn(err)
          break;

        case "SERVER":
          message = "The sharing service is currently unavailable. Please try again later"
          console.warn(err)
          break;

        case "HTTP":
          message = "The sharing service is currently unavailable. Please try again later"
          console.warn(err)
          break;

        default:
          message = "Unable to connect to the sharing service. Please check your internet connection and try again."
          console.warn(err)
      }

      if (
        err.message === "REQUEST_ABORTED" &&
        !networkTimedOut.current
      ) {
        return;
      }

      setDialog({
        type: "error",
        title: err.message === "TOO_BIG" ? "Project Too Large" : "Upload failed",
        message: message
      });
    } finally {
      shareBusy.current = false;
      clearTimeout(timeout);
      networkTimedOut.current = false;
    }

  }

  async function handleImportProject(shareId) {

    if (shareBusy.current) {
      return;
    }

    shareBusy.current = true;

    const controller = new AbortController();
    networkTimedOut.current = false;

    const timeout = setTimeout(() => {
      networkTimedOut.current = true;
      controller.abort();
    }, 30000);

    try {

      const project = await importProject(shareId, controller.signal)

      const result = await handleSaveAs(project.name, project);
      project.id = result.newId;
      project.createdAt = result.createdAt;
      project.updatedAt = result.updatedAt;

      setLoadedProject(project);

      setDialog({
        type: "import-success",
        name: project.name
      });

    } catch (err) {

      let message = "Unable to connect to the sharing service. Please check your internet connection and try again."
      switch (err.message) {

        case "REQUESTED_ABORT":
          if (networkTimedOut.current) {
            message = "The request timed out. Please check your internet connection and try again."
          } else {
            message = "Download cancelled."
          }
          console.warn(err)
          break;

        case "NOT_FOUND":
          message = "The shared project could not be found. Please check the share ID and try again."
          console.warn(err)
          break;

        case "NETWORK":
          message = "Unable to connect to the sharing service. Please check your internet connection and try again."
          console.warn(err)
          break;

        case "SERVER":
          message = "The sharing service is currently unavailable. Please try again later"
          console.warn(err)
          break;

        case "HTTP":
          message = "The sharing service is currently unavailable. Please try again later"
          console.warn(err)
          break;

        default:
          message = "Unable to connect to the sharing service. Please check your internet connection and try again."
          console.warn(err)
      }

      if (
        err.message === "REQUEST_ABORTED" &&
        !networkTimedOut.current
      ) {
        return;
      }

      setDialog({
        type: "error",
        title: "Import failed",
        message: message
      });

      return;

    } finally {
      shareBusy.current = false;
      clearTimeout(timeout);
      networkTimedOut.current = false;
    }

  }

  function buildFullProjectExport(
    datasets,
    projectName,
  ) {

    return {
      formatVersion: PROJECT_FORMAT_VERSION,
      name: projectName || 'Untitled Project',
      appVersion: APP_VERSION,
      device: {
        platform: Platform.OS,
        version: Platform.Version,
      },
      datasetCount: datasets.length,

      image,

      calibration,
      calibratedState,

      datasets: datasets.map(d => {
        const rawPoints = [...d.points];
        const pts = [...d.points].sort((a, b) => a.x - b.x);
        const transformed = pts.map(p => transformPoint(p, calibration)).filter(Boolean);


        return {
          id: d.id,
          name: d.name,
          colour: d.colour,
          visible: d.visible,
          locked: d.locked,
          curveMode: d.curveMode,

          rawPoints,
          transformedPoints: transformed,

        };
      }),
      uiState: {
        mode,
        zoomDisplay,

        scale: scale.value,
        translateXscaled: translateX.value / displaySize.width,
        translateYscaled: translateY.value / displaySize.height,

        activeDatasetId,
        showRegressionLine,

      },
    };
  }

  function getImageSize(uri) {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        reject
      );
    });
  }

  async function setProjectImage(uri, zoom, xTranslation, yTranslation) {

    if (typeof uri !== "string" || uri.length === 0) {

      setImage(null);
      setImageWidth(null);
      setImageHeight(null);
      setIsRestoringImage(false);
      return;
    }

    try {
      const { width, height } = await getImageSize(uri);

      setImageWidth(width);
      setImageHeight(height);
      setImage(uri);
      fitImage(width, height, zoom, xTranslation, yTranslation);
      setIsRestoringImage(false);

    } catch (error) {
      console.warn("Failed to load image:", error);

      setImage(uri);
      setImageWidth(null);
      setImageHeight(null);
      setIsRestoringImage(false);
    }
  }

  const pickImage = async () => {
    if (!storageReady) {
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({});

    if (!result.canceled) {
      try {
        const storedImage = await copyToLocal(result.assets[0]);

        setDirty(true);

        setProjectImage(storedImage.uri)

        !activeDatasetId &&
          setActiveDatasetId(datasets?.[0]?.id || null);
      } catch (error) {
        console.error("Failed to import image:", error);
        Alert.alert(
          "Import Failed",
          "The selected image could not be imported."
        );
      }
    }
  };

  function getTabForMode(mode) {

    if (
      mode === 'origin' ||
      mode === 'xRef' ||
      mode === 'yRef'
    ) {
      return 'calibrate';
    }

    return 'edit';
  }


  //
  // History
  // --------------------------------------------------

  function commitHistorySnapshot(snapshotString) {
    const latest = history[historyIndex];

    if (snapshotString === latest) {
      return;
    }

    const trimmed =
      history.slice(0, historyIndex + 1);

    const next = [
      ...trimmed,
      snapshotString,
    ];

    setHistory(next);

    setHistoryIndex(next.length - 1);
  }

  function handleUndo() {

    if (historyIndex <= 0) {
      return;
    }

    setIsRestoringHistory(true);

    const previous = JSON.parse(history[historyIndex - 1]);

    setDatasets(previous.datasets);
    setCalibration(previous.calibration);

    setProjectImage(previous.image);

    setHistoryIndex(historyIndex - 1);

    setDirty(true)

    setIsRestoringHistory(false);
  }

  function handleRedo() {

    if (
      historyIndex >= history.length - 1
    ) {
      return;
    }

    setIsRestoringHistory(true);

    const next = JSON.parse(history[historyIndex + 1]);

    setDatasets(next.datasets);
    setCalibration(next.calibration);
    setProjectImage(next.image);

    setHistoryIndex(historyIndex + 1);

    setDirty(true)

    setIsRestoringHistory(false);
  }

  //
  // Datasets
  // --------------------------------------------------

  function handleRenameDataset() {
    const active = datasets.find(
      d => d.id === activeDatasetId
    );

    if (!active) {
      return;
    }

    setRenameText(active.name);
    setRenameDatasetVisible(true);
  }

  function confirmRenameDataset(newName) {

    const name = newName.trim();

    if (!name) {
      return;
    }

    setDatasets(prev =>
      prev.map(d =>
        d.id === activeDatasetId
          ? {
            ...d,
            name,
          }
          : d
      )
    );

    setDirty(true);
  }

  function setDatasetColour(colour) {

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== activeDatasetId) {
          return d;
        }

        return {
          ...d,
          colour,
        };
      })
    );

    setDirty(true)
    setColourPickerVisible(false);
  }

  function createEmptyDataset(
    index = 0
  ) {

    return {
      id: generateId(),

      name: `Curve ${index + 1}`,

      colour:
        DATASET_COLOURS[
        index %
        DATASET_COLOURS.length
        ],

      visible: true,
      locked: false,
      curveMode: 'none',

      points: [],
    };
  }

  function handleDeleteDataset() {

    let updated =
      datasets.filter(
        d => d.id !== activeDatasetId
      );

    if (updated.length === 0) {

      updated = [
        createEmptyDataset(0)
      ];
    }

    setDatasets(updated);

    setActiveDatasetId(
      updated[0].id
    );

    setSelectedPointRef(null);
    setDirty(true)
  }

  function createDuplicateDataset(dataset) {

    const usedColours = datasets.map(d => d.colour);

    const newColour =
      DATASET_COLOURS.find(c => !usedColours.includes(c))
      ?? DATASET_COLOURS[0];

    return {
      ...dataset,
      id: generateId(),
      name: dataset.name + " Copy",
      colour: newColour,
      points: dataset.points.map(p => ({
        ...p,
        id: generateId(),
      })),
    };
  }

  function toggleCurveVisibility(
    datasetId
  ) {


    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== datasetId) {
          return d;
        }

        let mode = 'none';

        switch (d.curveMode) {
          case 'none':
            mode = 'linear';
            break;
          case 'linear':
            mode = 'spline';
            break;
          default:
            mode = 'none';
        }

        return {
          ...d,
          curveMode: mode,
        };
      })
    );
  }

  function toggleDatasetVisibility(
    datasetId
  ) {

    setSelectedPointRef(null);

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== datasetId) {
          return d;
        }

        return {
          ...d,
          visible: !d.visible,
        };
      })
    );
  }


  function toggleDatasetLock(datasetId) {

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== datasetId) {
          return d;
        }

        return {
          ...d,
          locked: !d.locked,
        };
      })
    );
  }


  //
  // Points
  // --------------------------------------------------

  const setPointPosition = (id, x, y) => {

    setDatasets(prev =>
      prev.map(d =>
        d.id === activeDatasetId
          ? {
            ...d,
            points: (d.points || []).map(p =>
              p.id === id ? { ...p, x, y } : p
            ),
          }
          : d
      )
    );
  };


  function finishDragTransaction(
    id, x, y
  ) {

    setPointPosition(id, x, y);

    setDirty(true)
    commitHistorySnapshot(snapshotString);
  }

  function finishCalibrationDragTransaction(
    dragTarget, x, y
  ) {

    if (dragTarget === "origin") {
      setCalibration(prev => ({
        ...prev,
        origin: { x, y },
      }));
    } else {
      const axis = dragTarget[0];        // "x" or "y"
      const point = dragTarget[1] === "0" ? "p0" : "p1";
      const value = axis === "x" ? x : y;

      setCalibration(prev => ({
        ...prev,
        [axis]: {
          ...prev[axis],
          [point]: value,
        },
      }));
    }

    setCalibratedState(true)
    setDirty(true)
    commitHistorySnapshot(snapshotString);
  }


  function findPointNear(x, y) {

    const radius = 5 / zoomDisplay;

    for (let i = datasets.length - 1; i >= 0; i--) {
      const d = datasets[i];

      for (let j = d.points.length - 1; j >= 0; j--) {
        const p = d.points[j];

        const dx = p.x - x;
        const dy = p.y - y;

        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          return {
            datasetId: d.id,
            pointId: p.id,
          };
        }

      }

    }

    return null;
  }

  const addPoint = (x, y) => {

    const hit = findPointNear(x, y);

    if (hit) {
      setSelectedPointRef(hit);
      setActiveDatasetId(hit.datasetId);

      return;
    }

    setDirty(true);
    setSelectedPointRef(null);

    if (mode !== 'points') {

      const calibrationPoint =
        mode === 'origin'
          ? { x, y }
          : mode === 'xRef'
            ? { x, y: null }
            : { x: null, y };

      setCalibration(prev => ({
        ...prev,
        [mode]: calibrationPoint,
      }));

      setCalibratedState(true);

      return;
    }

    if (!activeDataset?.visible) {
      return;
    }

    if (activeDataset?.locked) {
      return;
    }


    const addedPointId = generateId()
    const addedPointRef = { datasetId: activeDatasetId, pointId: addedPointId }
    const newPoint = { x, y, id: addedPointId }

    setDatasets(prev =>
      prev.map(d =>
        d.id === activeDatasetId
          ? { ...d, points: [...d.points, newPoint] }
          : d
      )
    );

    setSelectedPointRef(addedPointRef);

  };

  function getSelectedPointData() {
    const dataset = datasets.find(
      d => d.id === selectedPointRef?.datasetId
    );

    return dataset?.points.find(
      p => p.id === selectedPointRef?.pointId
    );
  }

  function handleDeletePoint() {

    const dataset =
      datasets.find(
        d => d.id === selectedPointRef.datasetId
      );

    if (dataset?.locked) {
      return;
    }

    if (!selectedPointRef) {
      return;
    }

    setDirty(true);

    setDatasets(prev =>
      prev.map(d => {

        if (
          d.id !== selectedPointRef.datasetId
        ) {
          return d;
        }

        return {
          ...d,

          points: d.points.filter(
            p =>
              p.id !== selectedPointRef.pointId
          ),
        };
      })
    );

    setSelectedPointRef(null);
  }


  function nudgePoint(dx, dy) {

    if (activeDataset.locked) {
      return;
    }

    if (!selectedPointRef && !nudgeAllPoints) {
      return;
    }

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== activeDatasetId) {
          return d;
        }

        return {
          ...d,

          points: d.points.map(p => {

            if (
              !nudgeAllPoints && p.id !== selectedPointRef.pointId
            ) {
              return p;
            }

            return {
              ...p,
              x: p.x + dx,
              y: p.y + dy,
            };
          }),
        };
      })
    );

    setDirty(true)
  }

  function nudgeCalibrationPoint(selection, dx, dy) {

    if (mode === 'points') {
      return;
    }

    if (selection === "origin") {
      const newValue = { x: calibration.origin.x + dx, y: calibration.origin.y + dy }
      setCalibration(prev => ({
        ...prev,
        origin: newValue,
      }));
    } else {
      const axis = selection[0];        // "x" or "y"
      const point = selection[1] === "0" ? "p0" : "p1";
      const magnitude = axis === "x" ? dx : dy;

      const newValue = calibration[axis][point] + magnitude
      setCalibration(prev => ({
        ...prev,
        [axis]: {
          ...prev[axis],
          [point]: newValue,
        },
      }));
    }

    setCalibratedState(true)

    setDirty(true)

  }

  function updateCalibrationValue(axis, key, value) {

    if (!Number.isFinite(value)) {
      return false;
    }

    setCalibration(prev => ({
      ...prev,
      [axis]: {
        ...prev[axis],
        [key]: value,
      },
    }));

    return true;
  }

  function computeStats(points) {
    if (!points.length) return null;

    const transformed = points.map(p => transformPoint(p, calibration)).filter(Boolean) || [];

    const xs = transformed.map(p => p.x);
    const ys = transformed.map(p => p.y);

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

  /*
 * Only call when:
 * - User selects a new image
 * - User presses Fit View
 *
 * Do NOT call when loading a project,
 * because zoom/pan should be restored.
 */
  function fitImage(
    imgWidth,
    imgHeight,
    newZoom,
    newXTranslation,
    newYTranslation,
  ) {

    if (
      displaySize.width === 0 ||
      displaySize.height === 0 ||
      imgWidth === 0 ||
      imgHeight === 0
    ) {
      return;
    }

    const fitScale = Math.min(
      displaySize.width / imgWidth,
      displaySize.height / imgHeight
    );

    const finalZoom = newZoom || 1
    const finalScale = finalZoom * fitScale
    setZoomDisplay(finalZoom)

    scale.value = finalScale;
    savedScale.value = finalScale;

    translateX.value = newXTranslation || 0;
    translateY.value = newYTranslation || 0;

    savedTranslateX.value = newXTranslation || 0;
    savedTranslateY.value = newYTranslation || 0;
  }

  function fitCurrentImage() {
    fitImage(imageWidth, imageHeight);
  }


  // ==================================================
  // JSX
  // ==================================================


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>

      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right', 'bottom']}
      >

        <View style={styles.titleBar}>


          <View style={{
            flex: 1,
            alignItems: 'flex-start'
          }}
          >
            <MenuButton
              label={projectName}
              onPress={() => setRenameProjectVisible(true)}
            />
          </View>

          <View style={styles.titleBarActions}>

            <IconButton
              icon="save"
              onPress={handleSave}
              disabled={!dirty}
            />
            <IconButton
              icon="open"
              onPress={onOpenList}
            />


            <MenuButton
              icon="menu"
              onPress={() => setProjectMenuVisible(true)} disabled={!dirty}
            />


          </View>

        </View>

        <View style={styles.toolBar}>

          <View style={styles.toolBarButton}>
            <IconButton
              icon="undo"
              label="Undo"
              onPress={handleUndo}
              disabled={historyIndex <= 0}
            />
          </View>


          <View style={styles.toolBarButton}>
            <IconButton
              icon="redo"
              label="Redo"
              onPress={handleRedo}
              disabled={
                historyIndex >= history.length - 1
              }
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.toolBarButton}>
            <IconButton
              icon="centreImage"
              label="Centre"
              onPress={centreView}
            />
          </View>

          <View style={styles.toolBarButton}>
            <IconButton
              icon="fit"
              label="Fit"
              onPress={fitCurrentImage}
            />
          </View>

        </View>

        <View style={styles.canvasArea}>

          <>

            <View style={styles.workspace}>



              <View style={
                [
                  styles.canvasContainer,
                ]
              }>

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
                  finishDragTransaction={finishDragTransaction}
                  finishCalibrationDragTransaction={finishCalibrationDragTransaction}
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


                <View style={[
                  styles.statusBarSection,
                  {
                    flex: 2,
                  }
                ]
                } >
                  {mode === 'points' &&
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
                        <Text style={styles.statusText}>
                          (No selection)
                        </Text>
                      )}
                    </>
                  }

                  {mode != 'points' &&
                    <>
                      <Text style={styles.statusText}>
                        Calibrate mode
                      </Text>
                      <Text style={styles.statusText}>
                        {mode === 'origin' && '[Set origin]'}
                        {mode === 'xRef' && '[Set X reference]'}
                        {mode === 'yRef' && '[Set Y reference]'}
                      </Text>
                    </>
                  }
                </View>


                {mode === 'points' &&
                  <View style={styles.statusBarSection} >
                    {selectedPointData ? (
                      <Text style={styles.statusTextCoords}>X: {graphPoint
                        ? graphPoint.x.toFixed(1)
                        : 'None'}
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:
                      </Text>
                    )}

                    {selectedPointData ? (
                      <Text style={styles.statusTextCoords}>Y: {graphPoint
                        ? graphPoint.y.toFixed(1)
                        : 'None'}
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }

                {mode === 'origin' &&
                  <View style={styles.statusBarSection} >
                    {calibration.origin ? (
                      <Text style={styles.statusTextCoords}>X: {calibration.origin.x
                        ? (calibration.origin.x).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.origin ? (
                      <Text style={styles.statusTextCoords}>Y: {calibration.origin.y
                        ? (100 - calibration.origin.y).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }

                {mode === 'xRef' &&
                  <View style={styles.statusBarSection} >
                    {calibration.xRef ? (
                      <Text style={styles.statusTextCoords}>X: {calibration.xRef.x
                        ? (calibration.xRef.x).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.xRef ? (
                      <Text style={styles.statusTextCoords}>Y: ({calibration.xRef.y
                        ? (100 - calibration.xRef.y).toFixed(1)
                        : 'None'}%)
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }

                {mode === 'yRef' &&
                  <View style={styles.statusBarSection} >
                    {calibration.yRef ? (
                      <Text style={styles.statusTextCoords}>X: ({calibration.yRef.x
                        ? (calibration.yRef.x).toFixed(1)
                        : 'None'}%)
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.yRef ? (
                      <Text style={styles.statusTextCoords}>Y: {calibration.yRef.y
                        ? (100 - calibration.yRef.y).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }

                <View style={[
                  styles.statusBarSection,
                  {
                    alignItems: 'flex-end',
                  }
                ]
                } >

                  <View style={styles.statusBarIndicator} >
                    <AppIcon
                      name={"notVisible"}
                      size={14}
                      colour={mode === 'points' && !activeDataset.visible ? COLOURS.alert : COLOURS.invisible}
                    />
                    <AppIcon
                      name={"locked"}
                      size={14}
                      colour={mode === 'points' && activeDataset.locked ? COLOURS.alert : COLOURS.invisible}
                    />

                  </View>
                  <Text style={styles.statusText}>

                    Zoom: {zoomDisplay > 0.1 ? (zoomDisplay * 100).toFixed(0) : (zoomDisplay * 100).toFixed(1)}%
                  </Text>
                </View>

              </View>


            </View>
          </>

        </View>

        <View
          style={[
            styles.controlsArea,
            !image && { borderColor: COLOURS.invisible },
          ]
          }
        >

          {image && (
            <>
              <View style={styles.tabBar}>

                <ScrollView
                  horizontal
                >

                  <TabButton
                    label="Datasets"
                    onPress={() => {
                      setWorkspaceTab('datasets')
                      setMode('points')
                    }}
                    active={workspaceTab === 'datasets'}
                  />
                  <TabButton
                    label="Point"
                    onPress={() => {
                      setWorkspaceTab('edit')
                      setMode('points')
                    }}
                    active={workspaceTab === 'edit'}
                  />
                  <TabButton
                    label="Calibrate"
                    onPress={() => {
                      setWorkspaceTab('calibrate')
                      setMode('origin')
                    }}
                    active={workspaceTab === 'calibrate'}
                  />
                  <TabButton
                    label="Analysis"
                    onPress={() => {
                      setWorkspaceTab('analysis')
                      setMode('points')
                    }}
                    active={workspaceTab === 'analysis'}
                  />
                  <TabButton
                    label="Project"
                    onPress={() => {
                      setWorkspaceTab('project')
                      setMode('points')
                    }}
                    active={workspaceTab === 'project'}
                  />

                </ScrollView>
              </View>

              <View
                style={styles.workspaceToolContainer}
              >

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
                  />
                )}

                {workspaceTab === 'datasets' && (

                  <View style={styles.datasetTabContainer}>



                    <ScrollView
                      style={styles.datasetList}
                      contentContainerStyle={{
                        paddingVertical: 1,
                      }}
                    >

                      {datasets.map(d => {
                        const isActive = d.id === activeDatasetId;
                        const rowOpacity =
                          d.visible
                            ? (d.locked ? 0.7 : 1)
                            : 0.4;

                        return <TouchableOpacity
                          key={d.id}
                          onPress={() => {
                            if (!isActive) {
                              setActiveDatasetId(d.id)
                              setSelectedPointRef(null)
                            }
                          }
                          }
                          style={[
                            styles.datasetRow,
                            {
                              opacity: rowOpacity,
                            },
                            d.id === activeDatasetId &&
                            styles.activeDatasetRow,
                          ]}
                        >

                          <View style={styles.datasetInfo}>
                            <View
                              style={[
                                styles.datasetColourDot,
                                {
                                  backgroundColor: d.colour,
                                },
                              ]}
                            />

                            <Text
                              style={styles.datasetName}
                            >
                              {d.name}
                            </Text>

                          </View>

                          <View style={styles.datasetOptions}>

                            <IconButton
                              icon={d.curveMode === 'none' ? 'hideCurve' : d.curveMode === 'linear' ? 'showCurveLine' : 'showCurveSpline'}
                              onPress={() => {
                                toggleCurveVisibility(d.id)
                                setDirty(true)
                              }
                              }
                            />
                            <IconButton
                              icon={d.visible ? 'visible' : 'notVisible'}
                              onPress={() => {
                                toggleDatasetVisibility(d.id)
                                setDirty(true)
                              }
                              }
                            />
                            <IconButton
                              icon={d.locked ? 'locked' : 'notLocked'}
                              onPress={() => {
                                toggleDatasetLock(d.id)
                                setDirty(true)
                              }
                              }
                            />


                          </View>
                        </TouchableOpacity>

                      })}
                    </ScrollView>

                    <View style={styles.datasetToolbar}>


                      <View style={styles.toolBarButton}>
                        <DatasetActionButton
                          icon="edit"
                          label="Rename"
                          onPress={handleRenameDataset}
                        />
                      </View>

                      <View style={styles.toolBarButton}>
                        <DatasetActionButton
                          icon="palette"
                          label="Colour"
                          onPress={() => setColourPickerVisible(true)}
                        />
                      </View>

                      <View style={styles.toolBarButton}>
                        <DatasetActionButton
                          icon="duplicate"
                          label="Duplicate"
                          onPress={() => {

                            const duplicateDataset = createDuplicateDataset(activeDataset);

                            setDatasets(prev => [
                              ...prev,
                              duplicateDataset,
                            ]);

                            setActiveDatasetId(
                              duplicateDataset.id
                            );

                            setSelectedPointRef(null);

                            setDirty(true)

                          }}
                        />
                      </View>

                      <View style={styles.toolBarButton}>
                        <DatasetActionButton
                          icon="delete"
                          label="Delete"
                          onPress={handleDeleteDataset}
                        />
                      </View>

                      <View style={styles.toolBarButton}>
                        <DatasetActionButton
                          icon="add"
                          label="New"
                          onPress={() => {

                            const newDataset = createEmptyDataset(datasets.length);

                            setDatasets(prev => [
                              ...prev,
                              newDataset,
                            ]);

                            setActiveDatasetId(
                              newDataset.id
                            );

                            setSelectedPointRef(null);

                            setDirty(true)

                          }}
                        />
                      </View>

                    </View>

                  </View>
                )}


                {workspaceTab === 'edit' && (

                  <View style={[
                    styles.workspaceToolBackground,
                    {
                      paddingVertical: 0,
                      justifyContent: 'space-between',
                    }
                  ]}>


                    <View
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: 2
                        },
                      ]}
                    >
                      <View
                        style={[
                          {
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 8,
                            backgroundColor: activeDataset.colour,
                          },
                        ]}
                      />
                      <IconButton
                        icon="previous"
                        onPress={() => {
                          if (!selectedPointRef) {
                            return;
                          }
                          const prevIndex = (selectedPointIndex - 1 + activeDataset.points.length) % activeDataset.points.length;
                          setSelectedPointRef({
                            datasetId: activeDataset.id,
                            pointId: activeDataset.points[prevIndex].id,
                          })
                        }}
                        disabled={!selectedPointRef}
                      />
                      {selectedPointData ? (
                        < Text style={[
                          {
                            ...TYPOGRAPHY.body,
                            color: COLOURS.text,
                            paddingHorizontal: 5
                          },
                        ]
                        }>
                          Point {selectedPointIndex + 1} / {pointCount}
                        </Text>
                      ) : (
                        <Text style={styles.statusText}>
                          (No selection)
                        </Text>
                      )}
                      <IconButton
                        icon="next"
                        onPress={() => {
                          if (!selectedPointRef) {
                            return;
                          }
                          const nextIndex = (selectedPointIndex + 1) % activeDataset.points.length;
                          setSelectedPointRef({
                            datasetId: activeDataset.id,
                            pointId: activeDataset.points[nextIndex].id,
                          })
                        }}
                        disabled={!selectedPointRef}
                      />
                      <View
                        style={[
                          {
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 8,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.pointControls}>
                      <Text
                        style={[
                          {
                            flex: 1,
                            alignItems: 'center',
                            paddingTop: 2
                          },
                        ]}>
                        Nudge:
                      </Text>
                      <IconButton
                        icon="nudgeLeft"
                        onPress={() => nudgePoint(-1 / zoomDisplay, 0)}
                        disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                      />
                      <View>
                        <IconButton
                          icon="nudgeUp"
                          onPress={() => nudgePoint(0, -1 / zoomDisplay)}
                          disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                        />
                        <IconButton
                          icon="nudgeDown"
                          onPress={() => nudgePoint(0, 1 / zoomDisplay)}
                          disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                        />

                      </View>
                      <IconButton
                        icon="nudgeRight"
                        onPress={() => nudgePoint(1 / zoomDisplay, 0)}
                        disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                      />
                      <View
                        style={[
                          {
                            flex: 1,
                            alignItems: 'center',
                          },
                        ]}
                      >
                        <Switch
                          value={nudgeAllPoints}
                          onValueChange={setNudgeAllPoints}
                        />
                        <Text>All points</Text>
                      </View>



                    </View>

                    <View style={[
                      {
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 8,
                        alignItems: 'center',
                        justifyContent: 'center'
                      }
                    ]
                    }>
                      <View style={[
                        {
                          flex: 1,
                        }
                      ]
                      }>
                        <IconButton
                          icon="delete"
                          label="Delete Point"
                          onPress={selectedPointRef && handleDeletePoint}
                          disabled={!selectedPointRef || activeDataset.locked}
                        />
                      </View>

                      <View style={[
                        {
                          flex: 1,
                        }
                      ]
                      }>
                        <IconButton
                          icon="clearAll"
                          label="Clear All"
                          onPress={() => {
                            setDatasets(prev =>
                              prev.map(d =>
                                d.id === activeDatasetId
                                  ? { ...d, points: [] }
                                  : d
                              )
                            );
                          }}
                          disabled={activeDataset.locked}
                        />
                      </View>

                    </View>
                  </View>
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
                    setDirty={setDirty}
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
                    setDirty={setDirty}
                    nudgeCalibrationPoint={nudgeCalibrationPoint}
                    zoomDisplay={zoomDisplay}
                  />
                )}

              </View>

            </>)}
        </View>


        <ColourPickerModal
          visible={colourPickerVisible}
          title="Dataset Colour"
          currentColour={activeDataset?.colour}
          setDatasetColour={newColour => {
            setDatasetColour(newColour)
            setColourPickerVisible(false);
          }}
          onCancel={() =>
            setColourPickerVisible(false)
          }
        />

        <TextInputModal
          visible={renameDatasetVisible}
          title="Rename Dataset"
          initialValue={renameText}
          confirmLabel="Rename"
          onConfirm={newName => {
            confirmRenameDataset(newName);
            setRenameDatasetVisible(false);
          }}
          onCancel={() =>
            setRenameDatasetVisible(false)
          }
        />

        <TextInputModal
          visible={renameProjectVisible}
          title="Rename Project"
          initialValue={projectName}
          confirmLabel="Rename"
          onConfirm={newName => {
            setProjectName(newName);
            setRenameProjectVisible(false);
            setDirty(true)
          }}
          onCancel={() =>
            setRenameProjectVisible(false)
          }
        />

        <TextInputModal
          visible={saveAsVisible}
          title="Save As..."
          initialValue={projectName}
          confirmLabel="Save"
          onConfirm={newName => {
            handleSaveAs(newName);
            setSaveAsVisible(false);
          }}
          onCancel={() =>
            setSaveAsVisible(false)
          }
        />

        {dialog?.type === "share-confirm" && (<Dialog
          visible={true}
          title="Share Project"
          buttons={[
            {
              text: "Cancel",
              onPress: () => setDialog({
                type: null,
              }),
            },
            {
              text: "Upload",
              onPress: () => {
                handleShareProject()
                setDialog({
                  type: "share-progress",
                });
              }
            }
          ]}
        >
          <Text style={styles.paragraph}>
            This project will be uploaded to the app's
            sharing service.
          </Text>

          <Text style={styles.paragraph}>
            Anyone with the share ID will be able
            to import a copy of the project.
          </Text>

          <Text style={styles.paragraph}>
            Shared projects are intended for temporary sharing
            and should not be relied upon for long-term storage.
          </Text>
        </Dialog>
        )}

        {dialog?.type === "share-progress" && (
          <Dialog
            visible={true}
            title="Uploading project..."
          >
            <View style={{
              marginBottom: 16
            }}>
              <ActivityIndicator size="large" />
            </View>

            <Text>
              Please wait a moment.
            </Text>
          </Dialog>
        )}

        {dialog?.type === "share-success" && (
          <Dialog
            visible={true}
            title="Project shared"
            buttons={[
              {
                text: "Close",
                onPress: () => {
                  setDialog({
                    type: null,
                  });
                },
              },
              {
                text: justCopied ? "Copied!" : "Copy ID",
                onPress: async () => {
                  await Clipboard.setStringAsync(dialog.share.shareId);
                  setJustCopied(true);

                  setTimeout(() => {
                    setJustCopied(false);
                  }, 2000);

                }
              }
            ]}
          >
            <Text style={styles.paragraph}>
              Share ID:
            </Text>
            <Text style={styles.sectionTitle}>
              {dialog.share.shareId}
            </Text>
          </Dialog>
        )}

        {dialog?.type === "import-input" && (<TextInputModal
          visible={true}
          title="Enter the Share ID:"
          initialValue={""}
          confirmLabel="Import"
          onConfirm={shareId => {
            handleImportProject(shareId);
            setDialog({
              type: "import-progress",
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

        {dialog?.type === "import-progress" && (
          <Dialog
            visible={true}
            title="Downloading project..."
          >
            <View style={{
              marginBottom: 16
            }}>
              <ActivityIndicator size="large" />
            </View>

            <Text>
              Please wait a moment.
            </Text>
          </Dialog>
        )}

        {dialog?.type === "import-success" && (
          <Dialog
            visible={true}
            title="Download complete"
            buttons={[
              {
                text: "Close",
                onPress: () => {
                  setDialog({
                    type: null,
                  });
                },
              },
            ]}
          >
            <Text style={styles.statusText}>
              Project:
            </Text>
            <Text style={styles.paragraph}>
              "{dialog.name || "(No name)"}"
            </Text>
          </Dialog>
        )}

        {dialog?.type === "error" && (
          <Dialog
            visible={true}
            title={dialog.title}
            buttons={[
              {
                text: "Close",
                onPress: () => {
                  setDialog({
                    type: null,
                  });
                },
              },
            ]}
          >
            <Text style={styles.paragraph}>
              {dialog.message}
            </Text>
          </Dialog>
        )}

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
              type: "share-confirm",
            });
            setProjectMenuVisible(false);
          }}
          handleImportProject={() => {
            setProjectMenuVisible(false);
            if (dirty) {

              Alert.alert(
                'Unsaved Changes',
                'Discard current project changes?',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                      setDialog({
                        type: "import-input",
                      });
                    },
                  },
                ]
              );

              return;
            } else {
              setDialog({
                type: "import-input",
              });
            }


          }}
          onCancel={() =>
            setProjectMenuVisible(false)
          }
        />

      </SafeAreaView >
    </GestureHandlerRootView >
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
    backgroundColor: COLOURS.surface
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

  workspaceToolBackground: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOURS.surface,
    borderRadius: 10,
  },

  datasetTabContainer: {
    flex: 1,
  },

  datasetList: {
    flex: 1,
    backgroundColor: COLOURS.surface,
    borderRadius: 10,
  },

  datasetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 1,
    minHeight: 32,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  activeDatasetRow: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
  },

  datasetInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },

  datasetColourDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  datasetName: {
    flexShrink: 1,
    fontSize: 16,
  },

  datasetOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  datasetToolbar: {
    flexDirection: 'row',
    gap: 2,
  },

  pointControls: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
  },

  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  axisInputs: {
    flexDirection: "row",
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },

  input: {
    borderWidth: 1,
    padding: 5,
    width: 60
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

  projectTabItemRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },

  projectTabItemLabel: {
    width: 80,
    fontWeight: 'bold',
  },

  projectTabItemValue: {
    flex: 1,
  },

  projectTabItemLabelSpacer: {
    width: 80,
  },

  calibrationRow: {
    flexDirection: 'row',
    gap: 0,
  },

  calibrationCell: {
    flex: 1,
  },

  workspaceToolbarContainer: {
    flex: 1,
    backgroundColor: COLOURS.surface,
    borderRadius: 10,
  },

  paragraph: {
    marginVertical: 4,
  },

});
