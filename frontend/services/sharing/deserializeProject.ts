import 'react-native-get-random-values';

import { SharedProject, SharedProjectImage } from './SharedProject'
import { saveImageDataToLocal } from "../storage/imageStorage";


export async function deserializeImage(
    imageData: SharedProjectImage
): Promise<string> {

    const storedImage = await saveImageDataToLocal(imageData)
    return storedImage.uri

}

export async function deserializeProject(project: SharedProject) {
    return {
        ...project,
        image: (project.image == null)
            ? null
            : (typeof project.image == 'string') ?
                project.image
                : await deserializeImage(project.image)

    };
}