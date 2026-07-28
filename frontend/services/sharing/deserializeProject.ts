import 'react-native-get-random-values';

import { SharedProject, SharedProjectImage } from './SharedProject'
import { saveImageDataToLocal } from "../storage/imageStorage";
import type { Project } from './Project';


export async function deserializeImage(
    imageData: SharedProjectImage
): Promise<string> {

    const storedImage = await saveImageDataToLocal(imageData)
    return storedImage.uri

}

export async function deserializeProject(project: SharedProject): Promise<Project> {
    return {
        ...project,
        id: null,
        datasetCount: project.datasets.length,
        image: (project.image == null)
            ? null
            : (typeof project.image == 'string') ?
                project.image
                : await deserializeImage(project.image)
    };
}