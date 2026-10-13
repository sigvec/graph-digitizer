import type { Project } from './Project';
import { deserializeProject } from './deserializeProject';
import { API_BASE_URL } from './apiConfig';
import { validateSharedProject } from './validateSharedProject';
import { migrateProjectFormat } from './projectMigrations';

export async function importProject(shareId: string, signal?: AbortSignal): Promise<Project> {
    try {
        const response = await fetch(`${API_BASE_URL}/shared-projects/${shareId}`, {
            signal,
        });

        if (!response.ok) {
            switch (response.status) {
                case 404:
                    throw new Error('NOT_FOUND');

                case 500:
                    throw new Error('SERVER');

                default:
                    throw new Error('HTTP');
            }
        }

        const result: unknown = await response.json();
        let migrated: Record<string, unknown>;
        try {
            migrated = migrateProjectFormat(result);
        } catch {
            throw new Error('INVALID_PROJECT');
        }
        const validation = validateSharedProject(migrated);
        if (!validation.valid) {
            throw new Error('INVALID_PROJECT');
        }

        const project = await deserializeProject(validation.value);

        return project;
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
