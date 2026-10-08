import { Platform } from 'react-native';

import type { Project } from '../../frontend/services/sharing/Project';
import { transformPoint } from '../calibration/transform';
import { ProjectExportData } from './types';

import Constants from 'expo-constants';
const APP_VERSION = Constants.expoConfig?.version ?? '0.5.0';
const PROJECT_FORMAT_VERSION = 1;

export function buildProjectExport(projectData: ProjectExportData): Project {
    return {
        formatVersion: PROJECT_FORMAT_VERSION,
        name: projectData.projectName.trim() || 'Untitled Project',
        appVersion: APP_VERSION,
        device: {
            platform: Platform.OS,
            version: Platform.Version,
        },
        datasetCount: projectData.datasets.length,

        image: projectData.image,

        calibration: projectData.calibration,
        calibratedState: projectData.calibratedState,

        datasets: projectData.datasets.map((d) => {
            // Preserve digitized order while exporting a sorted version for analysis.
            const rawPoints = [...d.points];
            const pts = [...d.points].sort((a, b) => a.x - b.x);
            const transformed = pts
                .map((p) => transformPoint(p, projectData.calibration))
                .filter(Boolean);

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
        lastShare: projectData.lastShare,
        uiState: {
            mode: projectData.mode,
            zoomDisplay: projectData.zoomDisplay,

            translateXscaled: projectData.translateXscaled,
            translateYscaled: projectData.translateYscaled,

            activeDatasetId: projectData.activeDatasetId,
            showRegressionLine: projectData.showRegressionLine,
        },
    };
}
