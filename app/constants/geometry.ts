import { AxisScale } from '../calibration/constants';
import { Calibration } from '../calibration/types';
import { SPACING } from '../theme';

export const LOGICAL_WIDTH = 100;
export const LOGICAL_HEIGHT = 100;
export const TOUCH_RADIUS = 5;
export const DISPLAY_PADDING = SPACING.xs;
export const DEFAULT_CALIBRATION: Calibration = {
    origin: { x: 10, y: LOGICAL_HEIGHT - 10 },
    x: {
        scaleType: AxisScale.LINEAR,
        p0: null,
        p1: LOGICAL_WIDTH - 10,
        value0: 0,
        value1: LOGICAL_WIDTH,
        units: 'units',
    },
    y: {
        scaleType: AxisScale.LINEAR,
        p0: null,
        p1: 10,
        value0: 0,
        value1: LOGICAL_HEIGHT,
        units: 'units',
    },
};
