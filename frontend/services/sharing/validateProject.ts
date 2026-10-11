import { AxisScale } from '../../../app/calibration/constants';
import { CurveMode } from '../../../app/datasets/constants';
import type { Project, StoredProject } from './Project';

export type ProjectValidationResult<T> =
    { valid: true; value: T } | { valid: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function validatePoint(value: unknown, path: string, errors: string[]): void {
    if (!isRecord(value)) {
        errors.push(`${path} must be an object`);
        return;
    }
    if (!isString(value.id) || value.id.length === 0)
        errors.push(`${path}.id must be a non-empty string`);
    if (!isFiniteNumber(value.x)) errors.push(`${path}.x must be a finite number`);
    if (!isFiniteNumber(value.y)) errors.push(`${path}.y must be a finite number`);
}

/** Validate the current V1 portable project schema. This deliberately does not migrate legacy data. */
export function validateProject(value: unknown): ProjectValidationResult<Project> {
    const errors: string[] = [];
    if (!isRecord(value)) return { valid: false, errors: ['Project must be an object'] };

    if (value.formatVersion !== 1) errors.push('formatVersion must be 1');
    if (!isString(value.name)) errors.push('name must be a string');
    if (!isString(value.appVersion)) errors.push('appVersion must be a string');
    if (!isRecord(value.device)) {
        errors.push('device must be an object');
    } else {
        if (!isString(value.device.platform)) errors.push('device.platform must be a string');
        if (!(isString(value.device.version) || isFiniteNumber(value.device.version))) {
            errors.push('device.version must be a string or finite number');
        }
    }
    if (!(value.image === null || isString(value.image)))
        errors.push('image must be a string or null');
    if (typeof value.calibratedState !== 'boolean')
        errors.push('calibratedState must be a boolean');

    if (!isRecord(value.calibration)) {
        errors.push('calibration must be an object');
    } else {
        const calibration = value.calibration;
        if (
            !isRecord(calibration.origin) ||
            !isFiniteNumber(calibration.origin.x) ||
            !isFiniteNumber(calibration.origin.y)
        ) {
            errors.push('calibration.origin must contain finite x and y values');
        }
        for (const axisName of ['x', 'y'] as const) {
            const axis = calibration[axisName];
            if (!isRecord(axis)) {
                errors.push(`calibration.${axisName} must be an object`);
                continue;
            }
            if (axis.scaleType !== AxisScale.LINEAR && axis.scaleType !== AxisScale.LOG) {
                errors.push(`calibration.${axisName}.scaleType is invalid`);
            }
            if (!(axis.p0 === null || isFiniteNumber(axis.p0)))
                errors.push(`calibration.${axisName}.p0 must be finite or null`);
            for (const key of ['p1', 'value0', 'value1'] as const) {
                if (!isFiniteNumber(axis[key]))
                    errors.push(`calibration.${axisName}.${key} must be finite`);
            }
            if (!isString(axis.units))
                errors.push(`calibration.${axisName}.units must be a string`);
        }
    }

    if (!Array.isArray(value.datasets)) {
        errors.push('datasets must be an array');
    } else {
        const ids = new Set<string>();
        value.datasets.forEach((dataset, index) => {
            const path = `datasets[${index}]`;
            if (!isRecord(dataset)) {
                errors.push(`${path} must be an object`);
                return;
            }
            if (!isString(dataset.id) || dataset.id.length === 0)
                errors.push(`${path}.id must be a non-empty string`);
            else if (ids.has(dataset.id)) errors.push(`${path}.id must be unique`);
            else ids.add(dataset.id);
            if (!isString(dataset.name)) errors.push(`${path}.name must be a string`);
            if (!isString(dataset.colour)) errors.push(`${path}.colour must be a string`);
            if (typeof dataset.visible !== 'boolean')
                errors.push(`${path}.visible must be a boolean`);
            if (typeof dataset.locked !== 'boolean')
                errors.push(`${path}.locked must be a boolean`);
            if (
                !Object.values(CurveMode).includes(
                    dataset.curveMode as (typeof CurveMode)[keyof typeof CurveMode],
                )
            ) {
                errors.push(`${path}.curveMode is invalid`);
            }
            if (!Array.isArray(dataset.rawPoints))
                errors.push(`${path}.rawPoints must be an array`);
            else
                dataset.rawPoints.forEach((point, pointIndex) =>
                    validatePoint(point, `${path}.rawPoints[${pointIndex}]`, errors),
                );
            if (!Array.isArray(dataset.transformedPoints))
                errors.push(`${path}.transformedPoints must be an array`);
            else
                dataset.transformedPoints.forEach((point, pointIndex) => {
                    if (point !== null)
                        validatePoint(point, `${path}.transformedPoints[${pointIndex}]`, errors);
                });
        });
        if (value.datasetCount !== value.datasets.length)
            errors.push('datasetCount must equal datasets.length');
    }

    if (typeof value.calibratedState !== 'boolean')
        errors.push('calibratedState must be a boolean');
    if (!isRecord(value.uiState)) {
        errors.push('uiState must be an object');
    } else {
        const ui = value.uiState;
        if (!isString(ui.mode) || (ui.mode !== 'points' && ui.mode !== 'calibration'))
            errors.push('uiState.mode is invalid');
        if (!isFiniteNumber(ui.zoomDisplay)) errors.push('uiState.zoomDisplay must be finite');
        if (!isFiniteNumber(ui.translateXscaled))
            errors.push('uiState.translateXscaled must be finite');
        if (!isFiniteNumber(ui.translateYscaled))
            errors.push('uiState.translateYscaled must be finite');
        if (!(ui.activeDatasetId === null || isString(ui.activeDatasetId)))
            errors.push('uiState.activeDatasetId must be a string or null');
        if (typeof ui.showRegressionLine !== 'boolean')
            errors.push('uiState.showRegressionLine must be a boolean');
        if (
            isString(ui.activeDatasetId) &&
            Array.isArray(value.datasets) &&
            !value.datasets.some((d) => isRecord(d) && d.id === ui.activeDatasetId)
        ) {
            errors.push('uiState.activeDatasetId must reference an existing dataset');
        }
    }
    if (value.lastShare !== undefined && value.lastShare !== null) {
        if (
            !isRecord(value.lastShare) ||
            !isString(value.lastShare.shareId) ||
            !isString(value.lastShare.sharedAt)
        ) {
            errors.push('lastShare must contain string shareId and sharedAt fields');
        }
    }

    return errors.length
        ? { valid: false, errors }
        : { valid: true, value: value as unknown as Project };
}

export function validateStoredProject(value: unknown): ProjectValidationResult<StoredProject> {
    const base = validateProject(value);
    if (!base.valid) return base;
    const errors: string[] = [];
    if (!isRecord(value)) return { valid: false, errors: ['Stored project must be an object'] };
    if (!isString(value.id) || value.id.length === 0) errors.push('id must be a non-empty string');
    if (!isString(value.createdAt) || Number.isNaN(Date.parse(value.createdAt)))
        errors.push('createdAt must be a valid timestamp');
    if (!isString(value.updatedAt) || Number.isNaN(Date.parse(value.updatedAt)))
        errors.push('updatedAt must be a valid timestamp');
    return errors.length
        ? { valid: false, errors }
        : { valid: true, value: value as unknown as StoredProject };
}
