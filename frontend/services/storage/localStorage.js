import AsyncStorage
    from '@react-native-async-storage/async-storage';

import { generateId } from '../../../app/utils/id';

const PROJECT_PREFIX = 'project:';

export async function saveProject(
    project
) {

    const now = new Date().toISOString();

    const id = generateId();

    const payload = {
        ...project,
        id,
        createdAt: now,
        updatedAt: now,
    };

    await AsyncStorage.setItem(
        PROJECT_PREFIX + id,
        JSON.stringify(payload)
    );

    return { id };
}

export async function loadProject(
    id
) {

    const json =
        await AsyncStorage.getItem(
            PROJECT_PREFIX + id
        );

    if (!json) {
        throw new Error(
            'Project not found'
        );
    }

    return JSON.parse(json);
}

export async function loadAllProjects() {

    const keys =
        await AsyncStorage.getAllKeys();

    const projectKeys =
        keys.filter(k =>
            k.startsWith(PROJECT_PREFIX)
        );

    const projects =
        await AsyncStorage.multiGet(
            projectKeys
        );

    const result = [];

    for (const [, json] of projects) {
        if (json !== null) {
            result.push(JSON.parse(json));
        }
    }

    return result;
}


export async function updateProject(
    id,
    project
) {

    const now = new Date().toISOString();

    const existing =
        await AsyncStorage.getItem(
            PROJECT_PREFIX + id
        );

    const createdAt = JSON.parse(existing)?.createdAt;

    const payload = {
        ...project,
        id,
        createdAt:
            createdAt ??
            now,
        updatedAt: now,
    };

    await AsyncStorage.setItem(
        PROJECT_PREFIX + id,
        JSON.stringify(payload)
    );

    return payload;
}

export async function deleteProject(
    id
) {

    await AsyncStorage.removeItem(
        PROJECT_PREFIX + id
    );
}