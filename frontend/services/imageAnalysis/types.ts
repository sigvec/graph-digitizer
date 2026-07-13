export interface Pixel {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface DecodedImage {
    width: number;
    height: number;
    pixels: Uint8Array;
}