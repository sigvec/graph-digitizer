export const AxisScale = Object.freeze({
    LINEAR: "linear",
    LOG: "log",
} as const);

export type AxisScale = typeof AxisScale[keyof typeof AxisScale];

export const Axis = Object.freeze({
    X: "X",
    Y: "Y",
} as const);

export type Axis = typeof Axis[keyof typeof Axis];