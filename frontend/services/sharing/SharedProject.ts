import type { Calibration } from '../../../app/calibration/types';
import type { StoredDataset } from './Project';

export interface SharedProject {
    formatVersion: number;
    name: string;
    appVersion: string;
    device: {
        platform: string;
        version: string | number;
    };
    image: SharedProjectImage | null;
    calibration: Calibration;
    calibratedState: boolean;
    datasets: StoredDataset[];
    uiState: {
        mode: string;
        zoomDisplay: number;
        translateXscaled: number;
        translateYscaled: number;
        activeDatasetId: string;
        showRegressionLine: boolean;
    };
}

export interface SharedProjectImage {
    mimeType: string;
    data: string;
}
