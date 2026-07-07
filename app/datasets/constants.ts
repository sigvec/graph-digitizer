export const CurveMode = {
    NONE: "none",
    POINTS: "points",
    LINEAR: "linear",
    SPLINE: "spline",
} as const;

export type CurveMode = typeof CurveMode[keyof typeof CurveMode];