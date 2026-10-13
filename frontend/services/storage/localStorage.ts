import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '../../../app/utils/id';
import type { Project, StoredProject } from '../sharing/Project';
import { validateProject, validateStoredProject } from '../sharing/validateProject';
import { migrateProjectFormat } from '../sharing/projectMigrations';
import type { SaveProjectResponse } from './SaveProjectResponse';

const PROJECT_PREFIX = 'project:';

export async function saveProject(project: Project): Promise<SaveProjectResponse> {
    const validation = validateProject(project);
    if (!validation.valid) {
        throw new Error(
            `Cannot save invalid current-format project: ${validation.errors.join('; ')}`,
        );
    }

    const now = new Date().toISOString();

    const id = generateId();

    const payload: StoredProject = {
        ...project,
        id,
        createdAt: now,
        updatedAt: now,
    };

    await AsyncStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(payload));

    return {
        id,
        createdAt: now,
        updatedAt: now,
    };
}

export async function loadProject(id: string): Promise<StoredProject> {
    const json = await AsyncStorage.getItem(PROJECT_PREFIX + id);

    if (!json) {
        throw new Error('Project not found');
    }

    try {
        const parsed: unknown = JSON.parse(json);
        const migrated = migrateProjectFormat(parsed);
        const validation = validateStoredProject(migrated);
        if (!validation.valid) {
            throw new Error(`Invalid current-format project: ${validation.errors.join('; ')}`);
        }
        return validation.value;
    } catch (err) {
        console.warn(`Failed to load project ${id}:`, err);
        throw new Error("Couldn't load project");
    }
}

/**
 * Load projects for user-facing lists. Invalid individual records are logged and
 * skipped so one damaged project cannot hide every healthy project.
 * Storage snapshot inconsistencies still throw because they make the read unreliable.
 */
export async function loadAllProjects(): Promise<StoredProject[]> {
    return loadProjects({ skipInvalidRecords: true });
}

/**
 * Load a complete, validated project snapshot for destructive maintenance.
 * Any invalid record causes this to throw so image cleanup cannot mistake an
 * image referenced by a corrupt project for an orphan.
 */
export async function loadAllProjectsForCleanup(): Promise<StoredProject[]> {
    return loadProjects({ skipInvalidRecords: false });
}

async function loadProjects(options: { skipInvalidRecords: boolean }): Promise<StoredProject[]> {
    const keys = await AsyncStorage.getAllKeys();
    const projectKeys = keys.filter((k) => k.startsWith(PROJECT_PREFIX));
    const projects = await AsyncStorage.multiGet(projectKeys);

    // A partial or inconsistent multiGet result is not a reliable snapshot.
    const returnedKeys = new Set(projects.map(([key]) => key));
    if (
        projects.length !== projectKeys.length ||
        returnedKeys.size !== projects.length ||
        projectKeys.some((key) => !returnedKeys.has(key))
    ) {
        throw new Error(
            'Cannot safely load projects: multiGet returned an incomplete or inconsistent result',
        );
    }

    const result: StoredProject[] = [];

    for (const [key, json] of projects) {
        // A null value despite the key being present indicates an inconsistent snapshot.
        if (json === null) {
            throw new Error(`Cannot safely load project record ${key}: missing value`);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(json);
        } catch (error) {
            const message = `Cannot load project record ${key}: invalid JSON (${String(error)})`;
            if (options.skipInvalidRecords) {
                console.warn(message);
                continue;
            }
            throw new Error(message);
        }

        let migrated: Record<string, unknown>;
        try {
            migrated = migrateProjectFormat(parsed);
        } catch (error) {
            const message = `Cannot migrate project record ${key}: ${String(error)}`;
            if (options.skipInvalidRecords) {
                console.warn(message);
                continue;
            }
            throw new Error(message);
        }

        const validation = validateStoredProject(migrated);
        if (!validation.valid) {
            const message = `Cannot load project record ${key}: ${validation.errors.join('; ')}`;
            if (options.skipInvalidRecords) {
                console.warn(message);
                continue;
            }
            throw new Error(message);
        }

        result.push(validation.value);
    }

    return result;
}

export async function updateProject(id: string, project: Project): Promise<SaveProjectResponse> {
    const validation = validateProject(project);
    if (!validation.valid) {
        throw new Error(
            `Cannot save invalid current-format project: ${validation.errors.join('; ')}`,
        );
    }

    const now = new Date().toISOString();

    const existing = await AsyncStorage.getItem(PROJECT_PREFIX + id);

    if (existing === null) {
        throw new Error('Project not found');
    }

    let existingParsed: unknown;
    try {
        existingParsed = JSON.parse(existing);
    } catch (error) {
        throw new Error(`Cannot update invalid stored project: invalid JSON (${String(error)})`);
    }

    let migratedExisting: Record<string, unknown>;
    try {
        migratedExisting = migrateProjectFormat(existingParsed);
    } catch (error) {
        throw new Error(`Cannot update invalid stored project: ${String(error)}`);
    }

    const existingValidation = validateStoredProject(migratedExisting);
    if (!existingValidation.valid) {
        throw new Error(
            `Cannot update invalid stored project: ${existingValidation.errors.join('; ')}`,
        );
    }

    const createdAt = existingValidation.value.createdAt;

    const payload: StoredProject = {
        ...project,
        id,
        createdAt: createdAt ?? now,
        updatedAt: now,
    };

    await AsyncStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(payload));

    return {
        id,
        createdAt,
        updatedAt: now,
    };
}

export async function deleteProject(id: string) {
    await AsyncStorage.removeItem(PROJECT_PREFIX + id);
}
