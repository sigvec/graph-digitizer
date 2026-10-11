export const CurveMode = {
    NONE: 'none',
    POINTS: 'points',
    LINEAR: 'linear',
    SPLINE: 'spline',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional const/type pair
export type CurveMode = (typeof CurveMode)[keyof typeof CurveMode];
