import { File } from "expo-file-system";

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


export async function serializeProject(project: Project) {
    return {
        ...project,
        image: project.image
            ? await serializeImage(project.image)
            : null,
    };
}