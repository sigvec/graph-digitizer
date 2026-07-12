import { Calibration } from '../../../app/calibration/types'
import { Dataset } from '../../../app/datasets/types'

export interface Project {
    formatVersion: number;
    name: string;
    appVersion: string,
    image: string | null;

    calibration: Calibration;
    calibrationState: boolean;
    datasets: Dataset[];
    lastShare?: {
        shareId: string,
        sharedAt: string
    }
    uiState: {
        mode: string;
        zoomDisplay: number;
        translateXscaled: number;
        translateYscaled: number;
        activeDatasetId: string;
        showRegressionLine: boolean;
    }
}