import { CurveMode } from './constants'
import { Point } from '../types/geometry'

export interface Dataset {
    id: string;
    name: string,
    colour: string;
    visible: boolean,
    locked: boolean,
    curveMode: CurveMode,
    points: Point[],
}

export interface DatasetStatistics {
    count: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}