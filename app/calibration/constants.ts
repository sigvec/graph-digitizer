export const AxisScale = Object.freeze({
    LINEAR: "linear",
    LOG: "log",
} as const);

export type AxisScale = typeof AxisScale[keyof typeof AxisScale];