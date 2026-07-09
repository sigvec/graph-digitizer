import { Calibration } from '../../../app/calibration/types'
import { Dataset } from '../../../app/datasets/types'

export interface SharedProject {
    name: string,
    formatVersion: number;
    image: {
        mimeType: string;
        data: string;      // Base64
    } | null;

    calibration: Calibration;
    datasets: Dataset[];
}

export interface SharedProjectImage {
    mimeType: string;
    data: string;
}