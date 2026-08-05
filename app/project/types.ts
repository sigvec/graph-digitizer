import type { Dataset } from '../datasets/types';
import type { Calibration } from '../calibration/types';
import { InteractionMode } from '../types/geometry';

export interface ProjectExportData {
    datasets: Dataset[];
    calibration: Calibration;
    image: string | null;

    projectName: string;
    zoomDisplay: number;
    calibratedState: boolean;
    showRegressionLine: boolean;
    mode: InteractionMode;
    activeDatasetId: string | null;
    lastShare?: LastShare;

    translateXscaled: number;
    translateYscaled: number;
}

export interface LastShare {
    shareId: string;
    sharedAt: string;
}
