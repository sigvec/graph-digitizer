import type { Calibration } from '../../../app/calibration/types';
import type { Point } from '../../../app/types/geometry';
import { CurveMode } from '../../../app/datasets/constants';

export interface StoredDataset {
    id: string;
    name: string;
    colour: string;
    visible: boolean;
    locked: boolean;
    curveMode: CurveMode;
    rawPoints: Point[];
    transformedPoints: (Point | null)[];
}

export interface Project {
    formatVersion: number;
    name: string;
    appVersion: string;
    device: {
        platform: string;
        version: string | number;
    };
    image: string | null;
    datasetCount: number;
    calibration: Calibration;
    calibratedState: boolean;
    datasets: StoredDataset[];
    lastShare?: {
        shareId: string;
        sharedAt: string;
    };
    uiState: {
        mode: string;
        zoomDisplay: number;
        translateXscaled: number;
        translateYscaled: number;
        activeDatasetId: string;
        showRegressionLine: boolean;
    };
}

export interface StoredProject extends Project {
    id: string;
    updatedAt: string;
    createdAt: string;
}
