import { AxisScale } from '../calibration/constants';
import { Calibration } from '../calibration/types';
import { LinearRegressionResult } from './regression';

const SUPERSCRIPT: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "=": "⁼",
    "(": "⁽",
    ")": "⁾",
    ".": "·",
};

const SUBSCRIPT: Record<string, string> = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "+": "₊",
    "-": "₋",
    "=": "₌",
    "(": "₍",
    ")": "₎",
};

function toSuperscript(value: number | string): string {
    return String(value)
        .split("")
        .map(c => SUPERSCRIPT[c] ?? c)
        .join("");
}

function toSubscript(value: number | string): string {
    return String(value)
        .split("")
        .map(c => SUBSCRIPT[c] ?? c)
        .join("");
}

function formatNumber(x: number): string {
    return Number(x.toPrecision(4)).toString();
}

function formatTerm(value: number): string {
    return value >= 0
        ? ` + ${formatNumber(value)}`
        : ` − ${formatNumber(-value)}`;
}

export function formatRegressionEquation(regression: LinearRegressionResult, calibration: Calibration): string {

    const xScaleType = calibration.x.scaleType;
    const yScaleType = calibration.y.scaleType;
    const slope = regression.slope;
    const intercept = regression.intercept;


    if (xScaleType === AxisScale.LINEAR) {
        if (yScaleType === AxisScale.LINEAR) {
            return `y = ${formatNumber(slope)}x${formatTerm(intercept)}`;
        } else {
            return `y = 10^(${formatNumber(slope)}x${formatTerm(intercept)})`;
        }
    }

    if (xScaleType === AxisScale.LOG) {
        if (yScaleType === AxisScale.LINEAR) {
            return `y = ${formatNumber(slope)}log${toSubscript(10)}(x)${formatTerm(intercept)}`;
        } else {
            return `y = ${formatNumber(10 ** intercept)}x${toSuperscript(formatNumber(slope))}`;
        }
    }

    return `y = ${formatNumber(slope)}x${formatTerm(intercept)}`;


}