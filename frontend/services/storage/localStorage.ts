import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '../../../app/utils/id';
import type { Project, StoredProject } from '../sharing/Project';
import type { SaveProjectResponse } from './SaveProjectResponse';
import { AxisScale } from '../../../app/calibration/constants';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../../app/constants/geometry';

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

        if (rawObject && typeof rawObject === 'object') {
            if ('color' in rawObject) {
                if (!('colour' in rawObject)) {
                    rawObject.colour = rawObject.color;
                }
                delete rawObject.color;
            }
        }

        if (
            rawObject?.calibration &&
            rawObject.calibration === 'object' &&
            'xRef' in rawObject.calibration
        ) {
            if (
                rawObject?.calibration &&
                rawObject.calibration === 'object' &&
                !('x' in rawObject.calibration)
            ) {
                rawObject.calibration.x = {
                    scaleType: AxisScale.LINEAR,
                    p0: null,
                    p1: rawObject.calibration.xRef.x ?? LOGICAL_WIDTH - 10,
                    value0: rawObject.axes?.x1 ?? 0,
                    value1: rawObject.axes?.x2 ?? LOGICAL_WIDTH - 10,
                };
                rawObject.calibration.y = {
                    scaleType: AxisScale.LINEAR,
                    p0: null,
                    p1: rawObject.calibration.yRef.y ?? 10,
                    value0: rawObject.axes?.y1 ?? 0,
                    value1: rawObject.axes?.y2 ?? LOGICAL_HEIGHT - 10,
                };
            }

            delete rawObject.calibration.xRef;
            delete rawObject.calibration.yRef;
            delete rawObject.axes;
        }

        if (rawObject?.ui && rawObject.ui === 'object' && 'translateX' in rawObject.ui) {
            if (
                rawObject?.ui &&
                rawObject.ui === 'object' &&
                !('translateXscaled' in rawObject.ui)
            ) {
                rawObject.ui.translateXscaled = rawObject.ui.translateX;
                rawObject.ui.translateYscaled = rawObject.ui.translateY;
            }
            delete rawObject.ui.translateX;
            delete rawObject.ui.translateY;
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
