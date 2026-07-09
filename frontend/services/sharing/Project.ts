import { Calibration } from '../../../app/calibration/types'
import { Dataset } from '../../../app/datasets/types'

export interface Project {
    formatVersion: number;
    image: string | null;

    calibration: Calibration;
    datasets: Dataset[];
}