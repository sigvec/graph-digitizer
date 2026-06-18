import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";

import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";

import formatTimestamp from "../utils/timestamp";

import {
  DATASET_COLOURS,
} from '../constants/colours';

import AppIcon from '../components/AppIcon';
import IconButton from '../components/IconButton';
import MenuButton from '../components/MenuButton';
import TabButton from '../components/TabButton';

import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { SafeAreaView } from 'react-native-safe-area-context';

import { generateId } from '../utils/id';

import storage from '../../frontend/services/storage';

import { hydrateProject } from '../utils/projectTransform';

import GraphCanvas, { FocalPinchPan, PerfectSimultaneousPinchPan, FlawlessSimultaneousPinchPan, BoundedPinchPan } from '../components/GraphCanvas';

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
} from '../constants/geometry';

import { TextInputModal, ProjectMenuModal, ColourPickerModal } from '../components/Modals';

import Constants from "expo-constants";

const APP_VERSION = Constants.expoConfig?.version ?? "0.1.0";

export default function MainScreen({ onOpenList, loadedProject, setLoadedProject, dirty, setDirty }) {

  const DISPLAY_PADDING = SPACING.xs;
  const DEFAULT_CALIBRATION = {
    origin: { x: 10, y: LOGICAL_HEIGHT - 10 },
    xRef: { x: LOGICAL_WIDTH - 10, y: null },
    yRef: { x: null, y: 10 },
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
  const [calibrationState, setCalibrationState] =
    useState({
      origin: false,
      xRef: false,
      yRef: false,
    });
  const [isDefaultCalibration, setIsDefaultCalibration] = useState(true);
  const [renameDatasetVisible, setRenameDatasetVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [renameProjectVisible, setRenameProjectVisible] = useState(false);
  const [saveAsVisible, setSaveAsVisible] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('edit');
  const [xMax, setXMax] = useState(String(LOGICAL_WIDTH));
  const [yMax, setYMax] = useState(String(LOGICAL_HEIGHT));
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [exportMode, setExportMode] = useState("raw");
  const [interpStep, setInterpStep] = useState("1");

  // ==================================================
  // Refs / Shared Values
  // ==================================================

  const isRestoringHistory = useRef(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
    ? transformPoint(selectedPointData)
    : null;

  const pointCount = activeDataset?.points?.length || 0;

  const transformedActive = activeDataset.points
    .map(transformPoint)
    .filter(Boolean);

  const linearFit = linearRegression(transformedActive);

  const linearR2 = linearFit
    ? computeR2(transformedActive, x => linearFit.a * x + linearFit.b)
    : null;

  const stats = computeStats(activeDataset?.points || []);

  // ==================================================
  // Effects
  // ==================================================


  useEffect(() => {
    if (!loadedProject) return;

    isRestoringHistory.current = true;

    const hydrated = hydrateProject(loadedProject);

    setCurrentProjectId(hydrated.id || null);

    setProjectName(
      hydrated.name || 'Untitled Project'
    );

    setProjectCreatedAt(hydrated.createdAt ?? null);
    setProjectUpdatedAt(hydrated.updatedAt ?? null);


    setCalibration(hydrated.calibration ?? DEFAULT_CALIBRATION);
    setCalibrationState(hydrated.calibrationState ?? { origin: false, xRef: false, yRef: false });
    setDatasets(hydrated.datasets);
    setActiveDatasetId(hydrated.datasets?.[0]?.id || null);

    setXMax(String(hydrated.axes?.xMax || '10'));
    setYMax(String(hydrated.axes?.yMax || '10'));

    const ui = hydrated.uiState || {};

    scale.value = ui.scale || 1;
    translateX.value = ui.translateX || 0;
    translateY.value = ui.translateY || 0;

    const imageUri = hydrated.image;
    setImage(imageUri);
    setImageWidth(null);
    setImageHeight(null);
    setZoomDisplay(1);

    Image.getSize(imageUri, (width, height) => {

      setImageWidth(width);
      setImageHeight(height);

      const fitScale = Math.min(
        displaySize.width / width,
        displaySize.height / height
      );

      setZoomDisplay(ui.scale / fitScale || 1);
    });

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

    const snapshot = {
      datasets: hydrated.datasets,
      calibration: hydrated.calibration,
      image: hydrated.image,
    };

    setHistory([JSON.stringify(snapshot)]);
    setHistoryIndex(0);

    requestAnimationFrame(() => {
      isRestoringHistory.current = false;
    });

    setLoadedProject(null)

    setDirty(false);

  }, [loadedProject]);


  useEffect(() => {

    if (isRestoringHistory.current) {
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
    setImage(null);

    setDatasets([
      newDataset
    ]);

    setActiveDatasetId(newDatasetId)


    setCalibration(
      DEFAULT_CALIBRATION
    );

    setCalibrationState({
      origin: false,
      xRef: false,
      yRef: false,
    });

    setZoomDisplay(1);

    setWorkspaceTab('edit')
    setMode('points')

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

    const now = new Date().toISOString();
    const finalCreated = projectCreatedAt ?? now;
    const finalUpdated = now;


    try {
      const finalName = projectName.trim() || 'Untitled Project';
      const project = buildFullProjectExport(
        datasets,
        finalName,
      );

      if (currentProjectId) {
        await storage.updateProject(
          currentProjectId,
          project
        );

      } else {
        const result = await storage.saveProject(project);

        setCurrentProjectId(result.id);

      }


      setProjectName(finalName);
      setProjectCreatedAt(finalCreated);
      setProjectUpdatedAt(finalUpdated);

      setDirty(false);

    } catch (err) {
      console.error(err);
    }
  }


  async function handleSaveAs(newName) {

    const now = new Date().toISOString();
    const finalCreated = now;
    const finalUpdated = now;

    try {
      const finalName = newName.trim() || 'Untitled Project';
      const project = buildFullProjectExport(
        datasets,
        finalName,
      );

      const result = await storage.saveProject(project);

      setCurrentProjectId(result.id);
      setProjectName(finalName);
      setProjectCreatedAt(finalCreated);
      setProjectUpdatedAt(finalUpdated);

      setDirty(false);

    } catch (err) {
      console.error(err);
    }
  }

  function confirmRenameProject() {

    const name = renameText.trim();

    if (!name) {
      return;
    }

    setProjectName(name)
    setDirty(true)

    setRenameProjectVisible(false);
  }

  function buildFullProjectExport(
    datasets,
    projectName,
  ) {

    return {
      name: projectName || 'Untitled Project',
      appVersion: APP_VERSION,
      device: {
        platform: Platform.OS,
        version: Platform.Version,
      },
      datasetCount: datasets.length,

      image,

      calibration,
      calibrationState,

      axes: {
        xMax: parseFloat(xMax),
        yMax: parseFloat(yMax),
        units: {
          x: "units",
          y: "units",
        },
      },

      datasets: datasets.map(d => {
        const rawPoints = [...d.points];
        const pts = [...d.points].sort((a, b) => a.x - b.x);
        const transformed = pts.map(transformPoint).filter(Boolean);


        return {
          id: d.id,
          name: d.name,
          color: d.color,
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
        translateX: translateX.value,
        translateY: translateY.value,

        activeDatasetId,

      },
    };
  }

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({});
    if (!result.canceled) {
      setDirty(true);
      const imageUri = result.assets[0].uri

      Image.getSize(imageUri, (width, height) => {

        setImage(imageUri);
        setImageWidth(width);
        setImageHeight(height);

        fitImage(width, height);
      });


      !activeDatasetId && setActiveDatasetId(
        datasets?.[0]?.id ||
        null
      );


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

  function createSnapshot() {
    return {
      datasets,
      calibration,
      image,
    };
  }

  function pushHistory() {

    const snapshot = createSnapshot();

    const nextHistory = [
      ...history.slice(0, historyIndex + 1),
      snapshot,
    ];

    setHistory(nextHistory);

    setHistoryIndex(nextHistory.length - 1);
  }

  function handleUndo() {

    if (historyIndex <= 0) {
      return;
    }

    isRestoringHistory.current = true;

    const previous = JSON.parse(history[historyIndex - 1]);

    setDatasets(previous.datasets);
    setCalibration(previous.calibration);
    setImage(previous.image);

    setHistoryIndex(historyIndex - 1);

    setDirty(true)

    requestAnimationFrame(() => {
      isRestoringHistory.current = false;
    });
  }

  function handleRedo() {

    if (
      historyIndex >= history.length - 1
    ) {
      return;
    }

    isRestoringHistory.current = true;

    const next = JSON.parse(history[historyIndex + 1]);

    setDatasets(next.datasets);
    setCalibration(next.calibration);
    setImage(next.image);

    setHistoryIndex(historyIndex + 1);

    setDirty(true)

    requestAnimationFrame(() => {
      isRestoringHistory.current = false;
    });
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

  function setDatasetColor(color) {

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== activeDatasetId) {
          return d;
        }

        return {
          ...d,
          color,
        };
      })
    );

    setColourPickerVisible(false);
  }

  function createEmptyDataset(
    index = 0
  ) {

    return {
      id: generateId(),

      name: `Curve ${index + 1}`,

      color:
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

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        setPointPosition(id, x, y);


        commitHistorySnapshot(snapshotString);


      });

    });
  }


  function findPointNear(x, y) {

    const radius = 5 / zoomDisplay;

    for (const d of datasets) {

      if (!d.visible) {
        continue;
      }

      for (const p of d.points) {

        const dx = p.x - x;
        const dy = p.y - y;

        const dist =
          Math.sqrt(dx * dx + dy * dy);

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
      const selectedDataset = datasets.find(d => d.id === hit.datasetId);

      const hitPoint = selectedDataset.points.find(p => p.id === hit.pointId);

      setSelectedPointRef(hit);
      setActiveDatasetId(hit.datasetId);

      return;
    }

    setDirty(true);
    setSelectedPointRef(null);

    if (mode !== "points") {

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

        setCalibrationState(prev => ({
          ...prev,
          [mode]: true,
        }));

        return;
      }


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

    if (!selectedPointRef) {
      return;
    }

    setDatasets(prev =>
      prev.map(d => {

        if (d.id !== selectedPointRef.datasetId) {
          return d;
        }

        return {
          ...d,

          points: d.points.map(p => {

            if (
              p.id !== selectedPointRef.pointId
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
  }

  //
  // Calibration
  // --------------------------------------------------

  function transformPoint(p) {

    const { origin, xRef, yRef } = calibration;

    if (!origin || !xRef || !yRef) return null;
    const X_MAX = parseFloat(xMax);
    const Y_MAX = parseFloat(yMax);

    if (isNaN(X_MAX) || isNaN(Y_MAX)) return null;
    if (xRef.x === origin.x || yRef.y === origin.y) return null;

    const xScale = X_MAX / (xRef.x - origin.x);
    const yScale = Y_MAX / (origin.y - yRef.y);

    return {
      x: (p.x - origin.x) * xScale,
      y: (origin.y - p.y) * yScale,
    };
  }


  function generateSimpleCSV(datasets) {
    let rows = ["series,x,y"];

    datasets.forEach(d => {

      const pts = [...d.points].sort((a, b) => a.x - b.x);
      const transformed = pts.map(transformPoint).filter(Boolean);

      // raw data
      transformed.forEach(p => {
        rows.push(`${d.name},${p.x},${p.y},`);
      });
    });

    return rows.join("\n");
  }


  function linearRegression(points) {
    if (points.length < 2) return null;

    let n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;

    const a = (n * sumXY - sumX * sumY) / denom;
    const b = (sumY - a * sumX) / n;

    return { a, b };
  }


  function computeR2(points, predict) {
    if (points.length < 2) return null;

    const meanY =
      points.reduce((sum, p) => sum + p.y, 0) / points.length;

    let ssTot = 0;
    let ssRes = 0;

    points.forEach(p => {
      const yHat = predict(p.x);
      ssTot += (p.y - meanY) ** 2;
      ssRes += (p.y - yHat) ** 2;
    });

    if (ssTot === 0) return null;

    return 1 - ssRes / ssTot;
  }


  function computeStats(points) {
    if (!points.length) return null;

    const transformed = points.map(transformPoint).filter(Boolean) || [];

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

  function resetView() {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;

    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

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
    imgHeight
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

    scale.value = fitScale;
    translateX.value = 0;
    translateY.value = 0;

    savedScale.value = fitScale;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    setZoomDisplay(1)
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


          <MenuButton
            label={projectName}
            onPress={() => setRenameProjectVisible(true)}
          />

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
                  datasets={datasets}
                  calibration={calibration}

                  activeDataset={activeDataset}
                  activeDatasetId={activeDatasetId}
                  selectedPointRef={selectedPointRef}
                  setSelectedPointRef={setSelectedPointRef}
                  finishDragTransaction={finishDragTransaction}
                  addPoint={addPoint}
                  setPointPosition={setPointPosition}

                  scale={scale}
                  translateX={translateX}
                  translateY={translateY}
                  savedScale={savedScale}
                  savedTranslateX={savedTranslateX}
                  savedTranslateY={savedTranslateY}



                  displaySize={displaySize}
                  imageHeight={imageHeight}
                  viewportSize={viewportSize}
                  setViewportSize={setViewportSize}
                  imageWidth={imageWidth}


                  setZoomDisplay={setZoomDisplay}
                />

              </View>

              <View style={styles.statusBar}>


                <View style={styles.statusBarSection} >
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
                            },
                            {
                              backgroundColor: activeDataset.color,
                            },
                          ]}
                        />

                        <Text style={styles.statusText}>
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
                        ? (calibration.origin.x / 3).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.origin ? (
                      <Text style={styles.statusTextCoords}>Y: {calibration.origin.y
                        ? (100 - calibration.origin.y / 3).toFixed(1)
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
                        ? (calibration.xRef.x / 3).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.origin ? (
                      <Text style={styles.statusTextCoords}>Y: ({calibration.origin.y
                        ? (100 - calibration.origin.y / 3).toFixed(1)
                        : 'None'}%)
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }

                {mode === 'yRef' &&
                  <View style={styles.statusBarSection} >
                    {calibration.origin ? (
                      <Text style={styles.statusTextCoords}>X: ({calibration.origin.x
                        ? (calibration.origin.x / 3).toFixed(1)
                        : 'None'}%)
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>X:</Text>
                    )}

                    {calibration.yRef ? (
                      <Text style={styles.statusTextCoords}>Y: {calibration.yRef.y
                        ? (100 - calibration.yRef.y / 3).toFixed(1)
                        : 'None'}%
                      </Text>
                    ) : (
                      <Text style={styles.statusTextCoords}>Y:</Text>
                    )}
                  </View>
                }



                <View style={[
                  styles.statusBarSection,
                  { alignItems: 'flex-end' }
                ]
                } >

                  <View style={styles.statusBarIndicator} >
                    <AppIcon
                      name={"notVisible"}
                      size={14}
                      color={mode === 'points' && !activeDataset.visible ? COLOURS.alert : COLOURS.invisible}
                    />
                    <AppIcon
                      name={"locked"}
                      size={14}
                      color={mode === 'points' && activeDataset.locked ? COLOURS.alert : COLOURS.invisible}
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
                    label="Analyse"
                    onPress={() => {
                      setWorkspaceTab('analyse')
                      setMode('points')
                    }}
                    active={workspaceTab === 'analyse'}
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

                  <View style={styles.workspaceToolBackground}>
                    <View style={styles.projectTabItemRow}>
                      <Text style={styles.projectTabItemLabel}>
                        Project:
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                      >
                        {projectName ? projectName : "Untitled"}
                      </Text>
                    </View>
                    <View style={styles.projectTabItemRow}>
                      <Text style={styles.projectTabItemLabel}>
                        Created:
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                      >
                        {formatTimestamp(projectCreatedAt) ?? "(Unsaved)"}
                      </Text>
                    </View>
                    <View style={styles.projectTabItemRow}>
                      <Text style={styles.projectTabItemLabel}>
                        Updated:
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                      >
                        {formatTimestamp(projectUpdatedAt) ?? "(Unsaved)"}
                      </Text>
                    </View>
                    <View style={styles.projectTabItemRow}>
                      <Text style={styles.projectTabItemLabel}>
                        Image:
                      </Text>
                      <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                      >
                        {image ? getFilename(image) : 'No image'}
                      </Text>
                    </View>


                    <View style={styles.projectTabItemRow}>
                      <View style={styles.projectTabItemLabelSpacer} />
                      <Text
                        style={styles.projectTabItemValue}
                      >
                        [{imageWidth} x {imageHeight}]
                      </Text>
                    </View>

                    <View style={styles.projectTabItemRow}>
                      <View style={styles.projectTabItemLabelSpacer} />
                      <View
                        style={styles.projectTabItemValue}
                      >
                        <IconButton
                          icon="image"
                          label="Change Image"
                          onPress={pickImage}
                        />
                      </View>
                    </View>


                  </View>

                )}

                {workspaceTab === 'datasets' && (

                  <View style={styles.datasetTabContainer}>



                    <ScrollView
                      style={styles.datasetList}
                      contentContainerStyle={{
                        paddingVertical: 1,
                      }}
                      vertical>

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
                                styles.datasetColorDot,
                                {
                                  backgroundColor: d.color,
                                },
                              ]}
                            />

                            <Text
                              style={styles.datasetName}
                            >
                              {d.name}
                            </Text>

                          </View>

                          <View style={styles.datasetActions}>

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


                      <IconButton
                        icon="edit"
                        label="Rename"
                        onPress={handleRenameDataset}
                      />

                      <IconButton
                        icon="palette"
                        label="Colour"
                        onPress={() => setColourPickerVisible(true)}
                      />

                      <IconButton
                        icon="delete"
                        label="Delete"
                        onPress={handleDeleteDataset}
                      />
                      <IconButton
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
                )}


                {workspaceTab === 'edit' && (

                  <View style={styles.workspaceToolBackground}>


                    <View style={styles.datasetInfo}>
                      <View
                        style={[

                          {
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            marginRight: 8,
                          },
                          {
                            backgroundColor: activeDataset.color,
                          },
                        ]}
                      />

                      <Text style={[
                        {
                          ...TYPOGRAPHY.title,
                          color: COLOURS.text,
                        },
                      ]
                      }>
                        {activeDataset?.name || 'None'}
                      </Text>

                    </View>
                    {selectedPointData ? (
                      < Text style={[
                        {
                          ...TYPOGRAPHY.body,
                          color: COLOURS.text,
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

                    <View style={
                      [{
                        ...TYPOGRAPHY.body,
                        color: COLOURS.text,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 20
                      },]
                    }>


                      {selectedPointData ? (
                        <Text>X: {graphPoint
                          ? graphPoint.x.toFixed(1)
                          : 'None'}
                        </Text>
                      ) : (
                        <Text style={styles.statusTextCoords}>X:
                        </Text>
                      )}

                      {selectedPointData ? (
                        <Text>Y: {graphPoint
                          ? graphPoint.y.toFixed(1)
                          : 'None'}
                        </Text>
                      ) : (
                        <Text style={styles.statusTextCoords}>Y:</Text>
                      )}

                    </View>


                    <View style={styles.pointControls}>
                      <IconButton
                        icon="nudgeLeft"
                        onPress={() => nudgePoint(-1, 0)}
                      />
                      <IconButton
                        icon="nudgeRight"
                        onPress={() => nudgePoint(1, 0)}
                      />
                      <IconButton
                        icon="nudgeUp"
                        onPress={() => nudgePoint(0, -1)}
                      />
                      <IconButton
                        icon="nudgeDown"
                        onPress={() => nudgePoint(0, 1)}
                      />
                    </View>

                    <View style={styles.pointControls}>



                      <IconButton
                        icon="delete"
                        label="Delete Point"
                        onPress={selectedPointRef && handleDeletePoint}
                        disabled={!selectedPointRef || activeDataset.locked}
                      />


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
                      />

                    </View>


                  </View>
                )}

                {workspaceTab === 'analyse' && (
                  <ScrollView
                    style={styles.workspaceToolbarContainer}
                    vertical
                  >
                    <View style={styles.workspaceToolBackground}>
                      <View>

                        <View style={styles.datasetInfo}>
                          <Text style={[
                            {
                              marginRight: 15
                            },
                          ]
                          }>
                            Selected:
                          </Text>
                          <View
                            style={[

                              {
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                marginRight: 8,
                              },
                              {
                                backgroundColor: activeDataset.color,
                              },
                            ]}
                          />

                          <Text style={[
                            {
                              ...TYPOGRAPHY.title,
                              color: COLOURS.text,
                            },
                          ]
                          }>
                            {activeDataset?.name || 'None'}
                          </Text>

                        </View>
                        {stats && (
                          <Text>
                            Points: {stats.count}
                          </Text>
                        )}

                        {stats && (
                          <Text>
                            X range: {stats.minX.toFixed(2)} – {stats.maxX.toFixed(2)}
                          </Text>
                        )}
                        {stats && (
                          <Text>
                            Y range: {stats.minY.toFixed(2)} – {stats.maxY.toFixed(2)}
                          </Text>
                        )}


                        {(!calibrationState.origin || !calibrationState.xRef || !calibrationState.yRef) && (
                          <View style={[
                            styles.statusBarIndicator,
                            { justifyContent: 'left' }
                          ]}>
                            <AppIcon
                              name={"alert"}
                              size={14}
                              color={'#d65910'}
                            />
                            <Text style={{ color: '#d65910' }}>
                              (Calibration not set)
                            </Text>
                          </View>
                        )}

                        {linearFit && (
                          <Text>
                            Linear fit: y = {linearFit.a.toFixed(3)}x + {linearFit.b.toFixed(3)}
                            {linearR2 != null ? `  (R² = ${linearR2.toFixed(4)})` : ""}
                          </Text>
                        )}

                      </View>

                      <View style={styles.controls}>
                        <IconButton
                          label="Export selected to CSV"
                          onPress={async () => {
                            if (!calibrationState.origin || !calibrationState.xRef || !calibrationState.yRef) {
                              alert("Calibration incomplete");
                              return;
                            }
                            const csv = generateSimpleCSV([activeDataset]);
                            await Clipboard.setStringAsync(csv);
                            alert("Copied!");
                          }}
                        />
                        <IconButton
                          label="Export all to CSV"
                          onPress={async () => {
                            if (!calibrationState.origin || !calibrationState.xRef || !calibrationState.yRef) {
                              alert("Calibration incomplete");
                              return;
                            }
                            const csv = generateSimpleCSV(datasets);
                            await Clipboard.setStringAsync(csv);
                            alert("Copied!");
                          }}
                        />
                      </View>
                    </View>
                  </ScrollView>
                )}

                {workspaceTab === 'calibrate' && (

                  <ScrollView
                    style={styles.workspaceToolbarContainer}
                    vertical
                  >

                    <View style={styles.workspaceToolBackground}>

                      <View style={styles.calibrationRow}>
                        <View style={[
                          styles.calibrationCell,
                        ]}
                        >
                          <IconButton
                            label="[Origin]"
                            onPress={() => setMode('origin')}
                            selected={mode === 'origin'}
                          />
                          {!calibrationState.origin && (
                            <View style={[
                              styles.statusBarIndicator,
                              { justifyContent: 'center' }
                            ]}>
                              <AppIcon
                                name={"alert"}
                                size={14}
                                color={'#d65910'}
                              />
                              <Text style={{ color: '#d65910' }}>
                                (Default)
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={[
                          styles.calibrationCell,
                        ]}>
                          <IconButton
                            label="[X ref]"
                            onPress={() => setMode('xRef')}
                            selected={mode === 'xRef'}
                          />
                          {!calibrationState.xRef && (
                            <View style={[
                              styles.statusBarIndicator,
                              { justifyContent: 'center' }
                            ]}>
                              <AppIcon
                                name={"alert"}
                                size={14}
                                color={'#d65910'}
                              />
                              <Text style={{ color: '#d65910' }}>
                                (Default)
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={[
                          styles.calibrationCell,
                        ]}>
                          <IconButton
                            label="[Y ref]"
                            onPress={() => setMode('yRef')}
                            selected={mode === 'yRef'}
                          />
                          {!calibrationState.yRef && (
                            <View style={[
                              styles.statusBarIndicator,
                              { justifyContent: 'center' }
                            ]}>
                              <AppIcon
                                name={"alert"}
                                size={14}
                                color={'#d65910'}
                              />
                              <Text style={{ color: '#d65910' }}>
                                (Default)
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.axisInputs}>
                        <Text>X Max:</Text>
                        <TextInput style={styles.input} value={xMax} onChangeText={setXMax} />
                        <Text>Y Max:</Text>
                        <TextInput style={styles.input} value={yMax} onChangeText={setYMax} />
                      </View>

                    </View>
                  </ScrollView>
                )}

              </View>

            </>)}
        </View>


        <ColourPickerModal
          visible={colourPickerVisible}
          title="Dataset Colour"
          currentColour={activeDataset?.color}
          setDatasetColour={newColour => {
            setDatasetColor(newColour)
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
            handleNewProject(true);
            setProjectMenuVisible(false);
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
    alignItems: 'start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
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
  },

  datasetColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },

  datasetName: {
    fontSize: 16,
  },

  datasetActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  datasetToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },

  pointControls: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },

  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },

  axisInputs: {
    flexDirection: "row",
    flexWrap: 'wrap',
    gap: 15,
    marginTop: 25,
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
    justifyContent: 'space-between',
    backgroundColor: COLOURS.surfaceAlt,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLOURS.border,
  },

  statusBarSection: {
    ...TYPOGRAPHY.small,
    color: COLOURS.muted,
  },

  statusText: {
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
    gap: 8,
  },

  calibrationCell: {
    flex: 1,
  },

  workspaceToolbarContainer: {
    flex: 1,
    backgroundColor: COLOURS.surface,
    borderRadius: 10,
  }

});
