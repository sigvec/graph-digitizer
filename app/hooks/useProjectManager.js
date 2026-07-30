import { useRef } from 'react';

import { Platform, Alert } from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import storage from '../../frontend/services/storage';
import { copyToLocal } from '../../frontend/services/storage/imageStorage';
import { shareProject } from '../../frontend/services/sharing/shareProject';
import { importProject } from '../../frontend/services/sharing/importProject';
import { transformPoint } from '../calibration/transform';

import { DEFAULT_CALIBRATION } from '../constants/geometry';

import Constants from 'expo-constants';
const APP_VERSION = Constants.expoConfig?.version ?? '0.4.1';
const PROJECT_FORMAT_VERSION = 1;

export function useProjectManager({ projectPayload, savedUiPreferences, storageLifecycle }) {
    const {
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
    } = projectPayload;

    const {
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
    } = savedUiPreferences;

    const {
        storageReady,
        setIncomingProject,
        setIsLoadingProject,
        setDialog,
        isDirty,
        onDirtyChanged,
        resetHistory,
        createEmptyDataset,
        setActiveDatasetId,
        activeDatasetId,
        getScaledTranslations,
    } = storageLifecycle;

    const shareBusy = useRef(false);
    const networkTimedOut = useRef(false);

    function resetWorkspace() {
        setIsLoadingProject(true);

        setCurrentProjectId(null);
        setProjectName('Untitled Project');

        const newDataset = createEmptyDataset(0);
        const newDatasets = [newDataset];
        const newDatasetId = newDataset.id;

        setProjectImage(null);

        setDatasets(newDatasets);

        setActiveDatasetId(newDatasetId);

        setCalibration(DEFAULT_CALIBRATION);

        setCalibratedState(false);

        setZoomDisplay(1);

        setWorkspaceTab('edit');
        setMode('points');

        setShowRegressionLine(false);

        setLastShare(undefined);

        const baseSnapShotString = {
            datasets: newDatasets,
            calibration: DEFAULT_CALIBRATION,
            image: null,
        };

        resetHistory(JSON.stringify(baseSnapShotString));

        setIsLoadingProject(false);
        onDirtyChanged(false);
    }

    function handleNewProject() {
        if (isDirty) {
            Alert.alert('Unsaved Changes', 'Discard current project changes?', [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: resetWorkspace,
                },
            ]);

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
            const project = buildFullProjectExport(datasets, finalName);

            if (currentProjectId) {
                const result = await storage.updateProject(currentProjectId, project);

                setProjectCreatedAt(result.createdAt);
                setProjectUpdatedAt(result.updatedAt);
            } else {
                const result = await storage.saveProject(project);

                setCurrentProjectId(result.id);
                setProjectCreatedAt(result.createdAt);
                setProjectUpdatedAt(result.updatedAt);
            }

            onDirtyChanged(false);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleSaveAs(newName, inputProject) {
        try {
            const finalName = newName.trim() || 'Untitled Project';

            const projectToSave = inputProject ?? buildFullProjectExport(datasets, finalName);

            const result = await storage.saveProject(projectToSave);
            setCurrentProjectId(result.id);
            setProjectName(finalName);
            setProjectCreatedAt(result.createdAt);
            setProjectUpdatedAt(result.updatedAt);

            onDirtyChanged(false);

            return result;
        } catch (err) {
            console.error(err);
        }
    }

    async function handleShareProject() {
        const finalName = projectName.trim() || 'Untitled Project';
        const project = buildFullProjectExport(datasets, finalName);

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
                type: 'share-success',
                share: share,
            });
            const now = new Date().toISOString();

            setLastShare({
                shareId: share.shareId,
                sharedAt: now,
            });

            onDirtyChanged(true);
        } catch (err) {
            let message =
                'Unable to connect to the sharing service. Please check your internet connection and try again.';

            switch (err.message) {
                case 'TOO_BIG':
                    message =
                        'This project is too large to be shared. Try reducing the image resolution before sharing.';
                    console.warn(err);
                    break;

                case 'REQUESTED_ABORT':
                    if (networkTimedOut.current) {
                        message =
                            'The request timed out. Please check your internet connection and try again.';
                    } else {
                        message = 'Upload cancelled.';
                    }
                    console.warn(err);
                    break;

                case 'NETWORK':
                    message =
                        'Unable to connect to the sharing service. Please check your internet connection and try again.';
                    console.warn(err);
                    break;

                case 'SERVER':
                    message =
                        'The sharing service is currently unavailable. Please try again later';
                    console.warn(err);
                    break;

                case 'HTTP':
                    message =
                        'The sharing service is currently unavailable. Please try again later';
                    console.warn(err);
                    break;

                default:
                    message =
                        'Unable to connect to the sharing service. Please check your internet connection and try again.';
                    console.warn(err);
            }

            if (err.message === 'REQUEST_ABORTED' && !networkTimedOut.current) {
                return;
            }

            setDialog({
                type: 'error',
                title: err.message === 'TOO_BIG' ? 'Project Too Large' : 'Upload failed',
                message: message,
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
            const project = await importProject(shareId, controller.signal);

            const result = await handleSaveAs(project.name, project);
            project.id = result.id;
            project.createdAt = result.createdAt;
            project.updatedAt = result.updatedAt;

            setIncomingProject(project);

            setDialog({
                type: 'import-success',
                name: project.name,
            });
        } catch (err) {
            let message =
                'Unable to connect to the sharing service. Please check your internet connection and try again.';
            switch (err.message) {
                case 'REQUESTED_ABORT':
                    if (networkTimedOut.current) {
                        message =
                            'The request timed out. Please check your internet connection and try again.';
                    } else {
                        message = 'Download cancelled.';
                    }
                    console.warn(err);
                    break;

                case 'NOT_FOUND':
                    message =
                        'The shared project could not be found. Please check the share ID and try again.';
                    console.warn(err);
                    break;

                case 'NETWORK':
                    message =
                        'Unable to connect to the sharing service. Please check your internet connection and try again.';
                    console.warn(err);
                    break;

                case 'SERVER':
                    message =
                        'The sharing service is currently unavailable. Please try again later';
                    console.warn(err);
                    break;

                case 'HTTP':
                    message =
                        'The sharing service is currently unavailable. Please try again later';
                    console.warn(err);
                    break;

                default:
                    message =
                        'Unable to connect to the sharing service. Please check your internet connection and try again.';
                    console.warn(err);
            }

            if (err.message === 'REQUEST_ABORTED' && !networkTimedOut.current) {
                return;
            }

            setDialog({
                type: 'error',
                title: 'Import failed',
                message: message,
            });

            return;
        } finally {
            shareBusy.current = false;
            clearTimeout(timeout);
            networkTimedOut.current = false;
        }
    }

    function buildFullProjectExport(datasets, projectName) {
        const { translateXscaled, translateYscaled } = getScaledTranslations();

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

            datasets: datasets.map((d) => {
                const rawPoints = [...d.points];
                const pts = [...d.points].sort((a, b) => a.x - b.x);
                const transformed = pts.map((p) => transformPoint(p, calibration)).filter(Boolean);

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
            lastShare,
            uiState: {
                mode,
                zoomDisplay,

                translateXscaled: translateXscaled,
                translateYscaled: translateYscaled,

                activeDatasetId,
                showRegressionLine,
            },
        };
    }

    const pickImage = async () => {
        if (!storageReady) {
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({});

        if (!result.canceled) {
            try {
                const storedImage = await copyToLocal(result.assets[0]);

                onDirtyChanged(true);

                setProjectImage(storedImage.uri, 1);

                !activeDatasetId && setActiveDatasetId(datasets?.[0]?.id || null);
            } catch (error) {
                console.error('Failed to import image:', error);
                Alert.alert('Import Failed', 'The selected image could not be imported.');
            }
        }
    };

    return {
        handleNewProject,
        handleCloseProject,
        handleSave,
        handleSaveAs,
        handleShareProject,
        handleImportProject,
        pickImage,
    };
}
