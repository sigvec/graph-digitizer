import { Calibration } from '../../../app/calibration/types'
import { Dataset } from '../../../app/datasets/types'

export interface SharedProject {
    formatVersion: number;
    name: string,
    appVersion: string,
    image: SharedProjectImage | null;

    calibration: Calibration;
    calibrationState: boolean;
    datasets: Dataset[];
    uiState: {
        mode: string;
        zoomDisplay: number;
        translateXscaled: number;
        translateYscaled: number;
        activeDatasetId: string;
        showRegressionLine: boolean;
    }
}

export interface SharedProjectImage {
    mimeType: string;
    data: string;
}