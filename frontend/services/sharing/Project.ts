import { Calibration } from '../../../app/calibration/types'
import { Dataset } from '../../../app/datasets/types'
import { CurveMode } from '../../../app/datasets/constants';
import { Point } from '../../../app/types/geometry';

export interface Project {
    id: string | null;
    formatVersion: number;
    name: string;
    appVersion: string,
    image: string | null;
    datasetCount: number;

    calibration: Calibration;
    calibratedState: boolean;
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


interface StoredDataset {
    id: string;
    name: string,
    colour: string;
    visible: boolean,
    locked: boolean,
    curveMode: CurveMode,
    rawPoints: Point[],
    transformedPoints: (Point | null)[]
}

export interface StoredProject {
    id: string;
    formatVersion: number;
    name: string;
    appVersion: string,
    image: string | null;
    datasetCount: number;

    calibration: Calibration;
    calibratedState: boolean;
    datasets: StoredDataset[];
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
    updatedAt: string;
    createdAt: string;
};