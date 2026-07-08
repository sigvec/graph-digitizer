import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

const imageDirectory = new Directory(Paths.document, 'images');

export interface StoredImage {
    uri: string;
    mimeType: string;
}

interface ProjectWithImage {
    image: string | null;
}

function extensionFromMimeType(mimeType?: string | null): string {
    switch (mimeType) {
        case 'image/jpeg':
            return 'jpg';
        case 'image/png':
            return 'png';
        case 'image/webp':
            return 'webp';
        case 'image/gif':
            return 'gif';
        case 'image/heic':
        case 'image/heif':
            return 'heic';
        default:
            return 'jpg';
    }
}

function extensionFromFilename(
    filename: string | null | undefined
): string | undefined {
    if (!filename) {
        return undefined;
    }

    const index = filename.lastIndexOf('.');

    if (index < 0) {
        return undefined;
    }

    return filename.substring(index + 1).toLowerCase();
}

function generateFilename(extension: string): string {
    return `${uuid()}.${extension}`;
}

export async function copyToLocal(
    asset: ImagePickerAsset
): Promise<StoredImage> {
    imageDirectory.create({
        idempotent: true,
        intermediates: true,
    });

    const extension =
        extensionFromFilename(asset.fileName) ??
        extensionFromMimeType(asset.mimeType);

    const filename = generateFilename(extension);

    const source = new File(asset.uri);
    const destination = new File(imageDirectory, filename);

    try {
        source.copy(destination);
    } catch (error) {
        throw new Error(`Failed to copy image: ${String(error)}`);
    }

    return {
        uri: destination.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
    };
}

export async function removeOrphanedImages(
    projects: ProjectWithImage[]
): Promise<void> {
    const referenced = new Set<string>();

    for (const project of projects) {
        if (project.image) {
            referenced.add(project.image);
        }
    }

    const images = imageDirectory.list();

    for (const image of images) {
        if (!referenced.has(image.uri)) {
            image.delete();
        }
    }
}