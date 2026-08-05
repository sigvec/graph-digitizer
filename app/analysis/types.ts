export interface LinearRegressionResult {
    slope: number;
    intercept: number;
}

export type Predictor = (x: number) => number;

export interface Coords {
    x: number;
    y: number;
}
