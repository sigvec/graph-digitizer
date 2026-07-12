import { File } from "expo-file-system";

import { SharedProject } from './SharedProject'
import { SharedProjectImage } from './SharedProject'
import { Project } from './Project'


export async function serializeImage(
    uri: string
): Promise<SharedProjectImage> {

    const file = new File(uri);

    const data = await file.base64();

    return {
        mimeType: file.type || "application/octet-stream",
        data,
    };
}

export async function serializeProject(project: Project): Promise<SharedProject> {
    const sharedProject = {
        formatVersion: project.formatVersion,
        name: project.name,
        appVersion: project.appVersion,
        image: project.image
            ? await serializeImage(project.image)
            : null,

        calibration: project.calibration,
        calibrationState: project.calibrationState,
        datasets: project.datasets,
        uiState: project.uiState,
    } satisfies SharedProject;

    return sharedProject;
}