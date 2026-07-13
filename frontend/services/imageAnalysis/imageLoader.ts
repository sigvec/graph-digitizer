import { Skia, ColorType, AlphaType } from '@shopify/react-native-skia';
import type { DecodedImage } from './types'

export async function loadDecodedImage(imageUri: string | null): Promise<DecodedImage | null> {

    if (!imageUri) { return null; }

    try {
        const data = await Skia.Data.fromURI(imageUri);

        const image = Skia.Image.MakeImageFromEncoded(data);
        if (!image) {
            return null;
        }

        const width = image.width();
        const height = image.height();

        const pixels = image.readPixels(0, 0, {
            width,
            height,
            colorType: ColorType.RGBA_8888,
            alphaType: AlphaType.Unpremul
        });

        if (pixels === null) {
            return null
        }

        if (!(pixels instanceof Uint8Array)) {
            throw new Error("Unexpected pixel format.");
        }

        if (pixels.length !== width * height * 4) {
            throw new Error("Unexpected pixel buffer size");
        }

        return {
            width,
            height,
            pixels,
        };
    }
    catch (err) {
        console.error("Failed to load image", err);
        return null;
    }

}