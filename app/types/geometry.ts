export interface Point {
    id: string;
    x: number;
    y: number;
}

export type InteractionMode = 'points' | 'origin' | 'xRef' | 'yRef';
