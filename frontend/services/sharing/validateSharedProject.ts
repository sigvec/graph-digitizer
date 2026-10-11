import type { SharedProject } from './SharedProject';
import { validateProject, type ProjectValidationResult } from './validateProject';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/** Validate the V1 shared-project payload before deserialization can write image data locally. */
export function validateSharedProject(value: unknown): ProjectValidationResult<SharedProject> {
    if (!isRecord(value)) {
        return { valid: false, errors: ['Shared project must be an object'] };
    }

    const errors: string[] = [];
    if (value.image === null) {
        // No image to validate.
    } else if (!isRecord(value.image)) {
        errors.push('image must be an image object or null');
    } else {
        if (!isNonEmptyString(value.image.mimeType))
            errors.push('image.mimeType must be a non-empty string');
        if (!isNonEmptyString(value.image.data))
            errors.push('image.data must be a non-empty string');
    }

    // The portable format intentionally has neither a local image URI nor datasetCount.
    // Normalize only those representation differences for the common structural checks.
    const normalized = {
        ...value,
        image: null,
        datasetCount: Array.isArray(value.datasets) ? value.datasets.length : undefined,
    };
    const base = validateProject(normalized);
    if (!base.valid) errors.push(...base.errors);

    return errors.length
        ? { valid: false, errors }
        : { valid: true, value: value as unknown as SharedProject };
}
