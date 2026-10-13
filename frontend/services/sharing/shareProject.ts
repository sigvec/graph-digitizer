import type { Project } from './Project';
import type { ShareResponse } from './ShareResponse';

import { serializeProject } from './serializeProject';

import { API_BASE_URL } from './apiConfig';
import { validateProject } from './validateProject';

const MAX_SHARED_PROJECT_SIZE = 20 * 1024 * 1024;

export async function shareProject(project: Project, signal?: AbortSignal): Promise<ShareResponse> {
    try {
        const validation = validateProject(project);
        if (!validation.valid) {
            throw new Error('INVALID_PROJECT');
        }

        const sharedProject = await serializeProject(validation.value);
        const json = JSON.stringify(sharedProject);
        const bytes = new TextEncoder().encode(json).length;

        if (bytes > MAX_SHARED_PROJECT_SIZE) {
            throw new Error('TOO_BIG');
        }

        const response = await fetch(`${API_BASE_URL}/shared-projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: json,
            signal,
        });

        if (!response.ok) {
            switch (response.status) {
                case 404:
                    throw new Error('NOT_FOUND');

                case 413:
                    throw new Error('TOO_BIG');

                case 500:
                    throw new Error('SERVER');

                default:
                    throw new Error('HTTP');
            }
        }

        const result = await response.json();

        return result;
    } catch (err) {
        if (err instanceof Error) {
            if (err.message === 'Network request failed') {
                throw new Error('NETWORK');
            }
            if (err.name === 'AbortError') {
                throw new Error('REQUESTED_ABORT');
            }
        }

        throw err;
    }
}
