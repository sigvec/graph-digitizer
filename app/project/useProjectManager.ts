import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import storage from '../../frontend/services/storage';
import { copyToLocal } from '../../frontend/services/storage/imageStorage';
import type { Project, StoredProject } from '../../frontend/services/sharing/Project';
import { ShareResponse } from '../../frontend/services/sharing/ShareResponse';
import { DEFAULT_CALIBRATION } from '../constants/geometry';
import type { Dataset } from '../datasets/types';
import { createEmptyDataset } from '../hooks/useDatasetActions';
import type { Calibration } from '../calibration/types';
import type { InteractionMode } from '../types/geometry';
import { buildProjectExport } from './export';
import { useProjectSharing } from './useProjectSharing';
import { LastShare } from './types';

export interface DialogPayload {
    type: string | null;
    title?: string;
    shareResponse?: ShareResponse;
    name?: string;
    message?: string;
}

interface ProjectPayload {
    datasets: Dataset[];
    setDatasets: (datasets: Dataset[]) => void;
    calibration: Calibration;
    setCalibration: (calibration: Calibration) => void;
    projectName: string;
    setProjectName: (name: string) => void;
    image: string | null;
    setProjectImage: (
        uri: string | null,
        zoom?: number,
        xTranslation?: number,
        yTranslation?: number,
    ) => void;
    setProjectCreatedAt: (timestamp: string) => void;
    setProjectUpdatedAt: (timestamp: string) => void;
    currentProjectId: string | null;
    setCurrentProjectId: (id: string | null) => void;
}

interface SavedUiPreferences {
    mode: InteractionMode;
    setMode: (mode: InteractionMode) => void;
    zoomDisplay: number;
    setZoomDisplay: (zoom: number) => void;
    showRegressionLine: boolean;
    setShowRegressionLine: (show: boolean) => void;
    calibratedState: boolean;
    setCalibratedState: (calibrated: boolean) => void;
    lastShare: LastShare | undefined;
    setLastShare: (share: LastShare | undefined) => void;
    setWorkspaceTab: (tab: string) => void;
}

interface StorageLifecycle {
    storageReady: boolean;
    setIncomingProject: (project: StoredProject) => void;
    setIsLoadingProject: (isLoading: boolean) => void;
    setDialogPayload: (share: DialogPayload) => void;
    isDirty: boolean;
    onDirtyChanged: (newValue: boolean) => void;
    resetHistory: (baseSnapshotString: string) => void;
    setActiveDatasetId: (id: string | null) => void;
    activeDatasetId: string | null;
    displaySize: { width: number; height: number };
    translation: { x: number; y: number };
}

interface useProjectManagerProps {
    projectPayload: ProjectPayload;
    savedUiPreferences: SavedUiPreferences;
    storageLifecycle: StorageLifecycle;
}

export function useProjectManager({
    projectPayload,
    savedUiPreferences,
    storageLifecycle,
}: useProjectManagerProps) {
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
        setDialogPayload,
        isDirty,
        onDirtyChanged,
        resetHistory,
        setActiveDatasetId,
        activeDatasetId,
        displaySize,
        translation,
    } = storageLifecycle;

    const getScaledTranslations = () => {
        const width = displaySize.width;
        const height = displaySize.height;

        return {
            translateXscaled: width > 0 ? translation.x / width : 0,
            translateYscaled: height > 0 ? translation.y / height : 0,
        };
    };

    function resetWorkspace() {
        setIsLoadingProject(true);

        const newDataset = createEmptyDataset(0);
        const newDatasetId = newDataset.id;
        const newDatasets = [newDataset];

        setCurrentProjectId(null);
        setProjectName('Untitled Project');
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
            const { translateXscaled, translateYscaled } = getScaledTranslations();

            const project = buildProjectExport({
                datasets,
                calibration,
                image,
                projectName: finalName,
                zoomDisplay,
                calibratedState,
                showRegressionLine,
                mode,
                activeDatasetId,
                lastShare,
                translateXscaled,
                translateYscaled,
            });

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

    async function handleSaveAs(newName: string, inputProject?: Project) {
        try {
            const finalName = newName.trim() || 'Untitled Project';
            const { translateXscaled, translateYscaled } = getScaledTranslations();

            const projectToSave =
                inputProject ??
                buildProjectExport({
                    datasets,
                    calibration,
                    image,
                    projectName: finalName,
                    zoomDisplay,
                    calibratedState,
                    showRegressionLine,
                    mode,
                    activeDatasetId,
                    lastShare,
                    translateXscaled,
                    translateYscaled,
                });

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

    const finalName = projectName.trim() || 'Untitled Project';
    const { translateXscaled, translateYscaled } = getScaledTranslations();
    const projectData = {
        datasets,
        calibration,
        image,
        projectName: finalName,
        zoomDisplay,
        calibratedState,
        showRegressionLine,
        mode,
        activeDatasetId,
        lastShare,
        translateXscaled,
        translateYscaled,
    };

    const { handleShareProject, handleImportProject } = useProjectSharing({
        projectData,
        setDialogPayload,
        setLastShare,
        onDirtyChanged,
        handleSaveAs,
        setIncomingProject,
    });

    const pickImage = async () => {
        if (!storageReady) {
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({});

        if (!result.canceled) {
            try {
                const storedImage = await copyToLocal(result.assets[0]);
                setProjectImage(storedImage.uri, 1);

                onDirtyChanged(true);

                !activeDatasetId && setActiveDatasetId(datasets?.[0]?.id);
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
