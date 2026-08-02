import { File } from 'expo-file-system';

import type { SharedProject, SharedProjectImage } from './SharedProject';
import type { Project } from './Project';

export async function serializeImage(uri: string): Promise<SharedProjectImage> {
    const file = new File(uri);

    const data = await file.base64();

    return {
        mimeType: file.type || 'application/octet-stream',
        data,
    };
}

export async function serializeProject(project: Project): Promise<SharedProject> {
    const sharedProject = {
        formatVersion: project.formatVersion,
        name: project.name,
        appVersion: project.appVersion,
        device: project.device,
        image: project.image ? await serializeImage(project.image) : null,
        calibration: project.calibration,
        calibratedState: project.calibratedState,
        datasets: project.datasets,
        uiState: project.uiState,
    } satisfies SharedProject;

    return sharedProject;
}
