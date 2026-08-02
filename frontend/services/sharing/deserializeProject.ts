import 'react-native-get-random-values';

import type { SharedProject, SharedProjectImage } from './SharedProject';
import type { Project } from './Project';
import { saveImageDataToLocal } from '../storage/imageStorage';

export async function deserializeImage(imageData: SharedProjectImage): Promise<string> {
    const storedImage = await saveImageDataToLocal(imageData);
    return storedImage.uri;
}

export async function deserializeProject(project: SharedProject): Promise<Project> {
    return {
        ...project,
        datasetCount: project.datasets.length,
        image:
            project.image == null
                ? null
                : typeof project.image == 'string'
                  ? project.image
                  : await deserializeImage(project.image),
    };
}
