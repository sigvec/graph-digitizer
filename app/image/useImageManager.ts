import { useCallback } from 'react';
import { SharedValue } from 'react-native-reanimated';

import { Image } from 'react-native';

export interface ImageSize {
    width: number;
    height: number;
}

export function getImageSize(uri: string): Promise<ImageSize> {
    return new Promise<ImageSize>((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });
}

interface ImageManagerProps {
    displaySize: { width: number; height: number };
    scale: SharedValue<number>;
    savedScale: SharedValue<number>;
    translateX: SharedValue<number>;
    translateY: SharedValue<number>;
    savedTranslateX: SharedValue<number>;
    savedTranslateY: SharedValue<number>;
    translation: { x: number; y: number };
    imageSize: ImageSize | null;
    setImageSize: React.Dispatch<React.SetStateAction<ImageSize | null>>;
    setIsRestoringImage: React.Dispatch<React.SetStateAction<boolean>>;
    setImage: React.Dispatch<React.SetStateAction<string | null>>;
    zoomDisplay: number;
    setZoomDisplay: React.Dispatch<React.SetStateAction<number>>;
}

export function useImageManager({
    displaySize,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    translation,
    imageSize,
    setImageSize,
    setImage,
    setIsRestoringImage,
    zoomDisplay,
    setZoomDisplay,
}: ImageManagerProps) {
    const fitImage = useCallback(
        (
            imageSize: ImageSize,
            newZoom?: number,
            newXTranslation?: number,
            newYTranslation?: number,
        ) => {
            let imgWidth = imageSize.width;
            let imgHeight = imageSize.height;
            if (
                displaySize.width === 0 ||
                displaySize.height === 0 ||
                imgWidth === 0 ||
                imgHeight === 0
            ) {
                return;
            }

            const fitScale = Math.min(displaySize.width / imgWidth, displaySize.height / imgHeight);

            const finalZoom = newZoom ?? 1;
            const finalScale = finalZoom * fitScale;

            setZoomDisplay(finalZoom);

            scale.value = finalScale;
            savedScale.value = finalScale;

            const finalXTranslation = newXTranslation ?? 0;
            const finalYTranslation = newYTranslation ?? 0;

            translateX.value = finalXTranslation;
            translateY.value = finalYTranslation;

            savedTranslateX.value = finalXTranslation;
            savedTranslateY.value = finalYTranslation;

            translation.x = finalXTranslation;
            translation.y = finalYTranslation;
        },
        [
            displaySize.width,
            displaySize.height,
            scale,
            savedScale,
            translateX,
            translateY,
            savedTranslateX,
            savedTranslateY,
            translation,
            setZoomDisplay,
        ],
    );

    function fitCurrentImage() {
        if (imageSize != null) {
            fitImage(imageSize);
        }
    }

    const setProjectImage = useCallback(
        async (uri: string | null, zoom?: number, xTranslation?: number, yTranslation?: number) => {
            setIsRestoringImage(true);

            try {
                if (typeof uri !== 'string' || uri.length === 0) {
                    setImage(null);
                    setImageSize(null);
                    return;
                }

                const { width, height } = await getImageSize(uri);

                setImageSize({ width, height });
                setImage(uri);

                if (typeof zoom === 'number' && Number.isFinite(zoom)) {
                    fitImage({ width, height }, Math.abs(zoom), xTranslation, yTranslation);
                } else {
                    const fitScale = Math.min(
                        displaySize.width / width,
                        displaySize.height / height,
                    );

                    const finalScale = zoomDisplay * fitScale;

                    scale.value = finalScale;
                    savedScale.value = finalScale;
                }
            } catch (error) {
                console.warn('Failed to load image:', error);

                setImage(null);
                setImageSize(null);
            } finally {
                setIsRestoringImage(false);
            }
        },
        [
            displaySize.width,
            displaySize.height,
            fitImage,
            zoomDisplay,
            scale,
            savedScale,
            setImage,
            setImageSize,
            setIsRestoringImage,
        ],
    );

    function centreView() {
        translateX.value = 0;
        translateY.value = 0;

        savedTranslateX.value = 0;
        savedTranslateY.value = 0;

        translation.x = 0;
        translation.y = 0;
    }

    return {
        fitCurrentImage,
        setProjectImage,
        centreView,
    };
}
