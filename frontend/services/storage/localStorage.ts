import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '../../../app/utils/id';
import type { Project, StoredProject } from '../sharing/Project';
import type { SaveProjectResponse } from './SaveProjectResponse';

const PROJECT_PREFIX = 'project:';

export async function saveProject(project: Project): Promise<SaveProjectResponse> {
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
        const rawObject = JSON.parse(json);

        if ('color' in rawObject && !('colour' in rawObject)) {
            rawObject.colour = rawObject.color;
            delete rawObject.color;
        }

        return rawObject;
    } catch (err) {
        console.warn(err);
        throw new Error("Couldn't load project");
    }
}

export async function loadAllProjects() {
    const keys = await AsyncStorage.getAllKeys();

    const projectKeys = keys.filter((k) => k.startsWith(PROJECT_PREFIX));

    const projects = await AsyncStorage.multiGet(projectKeys);

    const result: StoredProject[] = [];

    for (const [, json] of projects) {
        if (json !== null) {
            const parsedData = JSON.parse(json) as StoredProject;
            result.push(parsedData);
        }
    }

    return result;
}

export async function updateProject(id: string, project: Project): Promise<SaveProjectResponse> {
    const now = new Date().toISOString();

    const existing = (await AsyncStorage.getItem(PROJECT_PREFIX + id)) ?? '';

    const createdAt = JSON.parse(existing)?.createdAt;

    const payload: StoredProject = {
        ...project,
        id,
        createdAt: createdAt ?? now,
        updatedAt: now,
    };

    await AsyncStorage.setItem(PROJECT_PREFIX + id, JSON.stringify(payload));

    return {
        id,
        createdAt: now,
        updatedAt: now,
    };
}

export async function deleteProject(id: string) {
    await AsyncStorage.removeItem(PROJECT_PREFIX + id);
}
