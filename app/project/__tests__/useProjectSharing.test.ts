import { useProjectSharing } from '../useProjectSharing';
import {
    removeLocalImage,
    saveImageDataToLocal,
} from '../../../frontend/services/storage/imageStorage';
import type { SharedProject } from '../../../frontend/services/sharing/SharedProject';
import type { Project } from '../../../frontend/services/sharing/Project';

jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useRef: () => ({ current: false }),
}));

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('../../../frontend/services/storage/imageStorage', () => ({
    removeLocalImage: jest.fn(),
    saveImageDataToLocal: jest.fn(),
}));

jest.mock('../../../frontend/services/sharing/shareProject', () => ({
    shareProject: jest.fn(),
}));

const sharedProjectPayload: SharedProject = {
    formatVersion: 1,
    name: 'Imported project',
    appVersion: '0.5.3',
    device: { platform: 'test', version: '1' },
    image: {
        mimeType: 'image/png',
        data: 'aGVsbG8=',
    },
    calibration: {
        origin: { x: 0, y: 0 },
        x: {
            scaleType: 'linear',
            p0: null,
            p1: 100,
            value0: 0,
            value1: 10,
            units: '',
        },
        y: {
            scaleType: 'linear',
            p0: null,
            p1: 100,
            value0: 0,
            value1: 10,
            units: '',
        },
    },
    calibratedState: false,
    datasets: [
        {
            id: 'dataset-1',
            name: 'Dataset 1',
            colour: '#000000',
            visible: true,
            locked: false,
            curveMode: 'none',
            rawPoints: [{ id: 'p1', x: 1, y: 2 }],
            transformedPoints: [{ id: 'p1', x: 1, y: 2 }],
        },
    ],
    uiState: {
        mode: 'points',
        zoomDisplay: 1,
        translateXscaled: 0,
        translateYscaled: 0,
        activeDatasetId: 'dataset-1',
        showRegressionLine: false,
    },
};

const importedImageUri = 'file:///documents/images/imported.png';
const originalFetch = globalThis.fetch;

function makeSharing(
    handleSaveAs: (
        name: string,
        project?: Project,
    ) => Promise<
        | {
              id: string;
              createdAt: string;
              updatedAt: string;
          }
        | undefined
    >,
) {
    const setDialogPayload = jest.fn();
    const setIncomingProject = jest.fn();

    // This integration test invokes the hook directly because its only React hook is useRef,
    // which is mocked above to avoid requiring a React renderer.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sharing = useProjectSharing({
        projectData: {} as never,
        setDialogPayload,
        setLastShare: jest.fn(),
        onDirtyChanged: jest.fn(),
        handleSaveAs,
        setIncomingProject,
    });

    return {
        sharing,
        setDialogPayload,
        setIncomingProject,
    };
}

describe('useProjectSharing import rollback integration', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        // Suppress expected warnings from the deliberately triggered failure paths.
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Mock the HTTP boundary, but use the real import, validation,
        // and deserialization implementations.
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue(sharedProjectPayload),
        } as unknown as Response);

        // Mock filesystem operations so the tests don't touch disk.
        jest.mocked(saveImageDataToLocal).mockResolvedValue({
            uri: importedImageUri,
            mimeType: 'image/png',
        });

        jest.mocked(removeLocalImage).mockResolvedValue(undefined);
    });

    afterEach(() => {
        warn.mockRestore();
    });

    afterAll(() => {
        globalThis.fetch = originalFetch;
    });

    it('writes the shared image through deserialization, then removes it if saving fails', async () => {
        const { sharing, setIncomingProject, setDialogPayload } = makeSharing(
            async () => undefined,
        );

        await sharing.handleImportProject('share-id');

        // The real import and validation pipeline should fetch the shared
        // project and pass its image to the deserializer.
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://api.getgraphdata.com/shared-projects/share-id',
            expect.objectContaining({
                signal: expect.anything(),
            }),
        );

        expect(saveImageDataToLocal).toHaveBeenCalledWith(sharedProjectPayload.image);

        // Saving failed, so the image created during deserialization
        // must be removed.
        expect(removeLocalImage).toHaveBeenCalledWith(importedImageUri);

        expect(setIncomingProject).not.toHaveBeenCalled();

        expect(setDialogPayload).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                title: 'Import failed',
            }),
        );

        // The save failure is expected and logged, but should not pollute
        // Jest's console output.
        expect(warn).toHaveBeenCalledWith(expect.any(Error));
    });

    it('keeps the imported image when saving succeeds', async () => {
        const { sharing, setIncomingProject } = makeSharing(async () => ({
            id: 'saved-project',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        }));

        await sharing.handleImportProject('share-id');

        expect(saveImageDataToLocal).toHaveBeenCalledWith(sharedProjectPayload.image);

        expect(removeLocalImage).not.toHaveBeenCalled();

        expect(setIncomingProject).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'saved-project',
                image: importedImageUri,
                datasetCount: 1,
            }),
        );
    });

    it('still reports the import failure if removing the image also fails', async () => {
        jest.mocked(removeLocalImage).mockRejectedValue(new Error('delete failed'));

        const { sharing, setDialogPayload } = makeSharing(async () => undefined);

        await sharing.handleImportProject('share-id');

        expect(removeLocalImage).toHaveBeenCalledWith(importedImageUri);

        expect(setDialogPayload).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'error',
                title: 'Import failed',
            }),
        );

        // Cleanup failure should be logged without preventing the error dialog.
        expect(warn).toHaveBeenCalledWith(
            'Failed to remove image from unsuccessful project import',
            expect.any(Error),
        );
    });
});
