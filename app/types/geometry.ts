export interface Point {
    id: string;
    x: number;
    y: number;
}

export interface SelectedPointRef {
    datasetId: string;
    pointId: string;
}

export type InteractionMode = 'points' | 'calibration';
