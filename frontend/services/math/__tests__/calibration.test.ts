import { Calibration, AxisCalibration } from '../../../../app/calibration/types';
import { transformPoint } from '../../../../app/calibration/transform';

import { AxisScale } from '../../../../app/calibration/constants';

describe('Graph Coordinate Transformation Layer', () => {
    // Test Case 1: Linear Transformation
    test('correctly converts linear scale pixels to graph units', () => {
        // 400 pixel wide canvas area
        const mockXCalibrtionLinear: AxisCalibration = {
            scaleType: AxisScale.LINEAR,
            p0: 100,
            p1: 500,
            value0: 0,
            value1: 100,
            units: '',
        };

        // Canvas inverted Y axis
        const mockYCalibrtionLinear: AxisCalibration = {
            scaleType: AxisScale.LINEAR,
            p0: 500,
            p1: 100,
            value0: 0,
            value1: 50,
            units: '',
        };

        const mockLinearConfig: Calibration = {
            origin: { x: 0, y: 0 },
            x: mockXCalibrtionLinear,
            y: mockYCalibrtionLinear,
        };

        // Exactly halfway across the screen (Pixel 300) should equal graph value 50
        const pixelInput = { id: '', x: 300, y: 300 };
        const result = transformPoint(pixelInput, mockLinearConfig);

        expect(result?.x).toBe(50);
        expect(result?.y).toBe(25);
    });

    // Test Case 2: Logarithmic Transformation

    // 400 pixel wide canvas area
    const mockXCalibrtionLog: AxisCalibration = {
        scaleType: AxisScale.LOG,
        p0: 0,
        p1: 100,
        value0: 1,
        value1: 100,
        units: '',
    };

    // Canvas inverted Y axis
    const mockYCalibrtionLinear: AxisCalibration = {
        scaleType: AxisScale.LINEAR,
        p0: 100,
        p1: 0,
        value0: 1,
        value1: 10,
        units: '',
    };

    test('correctly converts logarithmic scale pixels to graph units', () => {
        const mockLogConfig: Calibration = {
            origin: { x: 0, y: 0 },
            x: mockXCalibrtionLog,
            y: mockYCalibrtionLinear,
        };

        // Halfway point on a base-10 log scale from 1 to 100 is 10 (10^1)
        const pixelInput = { id: '', x: 50, y: 50 };
        const result = transformPoint(pixelInput, mockLogConfig);

        expect(result?.x).toBeCloseTo(10, 4); // Handles JS floating point rounding issues safely
    });
});
