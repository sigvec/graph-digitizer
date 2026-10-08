export interface TracePoint {
    x: number;
    y: number;
}

export interface TraceVector {
    x: number;
    y: number;
}

export interface TraceOptions {
    stepSize: number;
    searchRadius: number;
    maxPoints: number;
}

export type TraceTermination =
    'curve_end' | 'low_confidence' | 'ambiguous' | 'boundary' | 'max_length' | 'loop_detected';

export interface TraceResult {
    points: TracePoint[];
    confidence: number[];
    termination: TraceTermination;
    /** Experimental: underlying path-following positions before centreline correction. */
    navigationPoints?: TracePoint[];
}
