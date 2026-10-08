export interface TracePixel {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface TraceImage {
    width: number;
    height: number;

    getPixel(x: number, y: number): TracePixel;
}
