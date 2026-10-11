import { copyToLocal, saveImageDataToLocal } from '../imageStorage';
import type { SharedProjectImage } from '../../sharing/SharedProject';

const mockWrite = jest.fn();
const mockCopy = jest.fn();
const mockDelete = jest.fn();

jest.mock('react-native-get-random-values', () => ({}));

jest.mock('expo-file-system', () => {
    class MockDirectory {
        uri: string;
        constructor(_base: unknown, name: string) {
            this.uri = `file:///documents/${name}`;
        }
        create = jest.fn();
        list = jest.fn(() => []);
    }

    class MockFile {
        uri: string;
        type = 'image/png';
        constructor(parentOrUri: unknown, filename?: string) {
            this.uri = filename
                ? `${(parentOrUri as { uri: string }).uri}/${filename}`
                : String(parentOrUri);
        }
        write = mockWrite;
        copy = mockCopy;
        base64 = jest.fn(async () => 'aGVsbG8=');
        delete = mockDelete;
    }

    return {
        Directory: MockDirectory,
        File: MockFile,
        Paths: { document: 'file:///documents' },
    };
});

jest.mock('uuid', () => ({ v4: () => 'test-image-id' }));

describe('saveImageDataToLocal', () => {
    beforeEach(() => {
        mockWrite.mockClear();
        mockCopy.mockReset();
        mockDelete.mockReset();
    });

    it.each([
        ['image/png', 'png'],
        ['image/jpeg', 'jpg'],
        ['image/webp', 'webp'],
        ['image/gif', 'gif'],
        ['image/heic', 'heic'],
        ['image/heif', 'heic'],
        ['application/octet-stream', 'jpg'],
    ])('uses the expected extension for %s', async (mimeType, extension) => {
        const image: SharedProjectImage = { mimeType, data: 'aGVsbG8=' };

        const result = await saveImageDataToLocal(image);

        expect(result.uri).toBe(`file:///documents/images/test-image-id.${extension}`);
        expect(result.mimeType).toBe(mimeType);
    });

    it('writes the supplied image data as base64', async () => {
        const image: SharedProjectImage = {
            mimeType: 'image/png',
            data: 'aGVsbG8=',
        };

        await saveImageDataToLocal(image);

        expect(mockWrite).toHaveBeenCalledWith('aGVsbG8=', { encoding: 'base64' });
    });
});

describe('image storage failure cleanup', () => {
    beforeEach(() => {
        mockWrite.mockReset();
        mockCopy.mockReset();
        mockDelete.mockReset();
    });

    it('attempts to remove a partial file when writing imported image data fails', async () => {
        mockWrite.mockImplementationOnce(() => {
            throw new Error('disk full');
        });

        await expect(
            saveImageDataToLocal({ mimeType: 'image/png', data: 'aGVsbG8=' }),
        ).rejects.toThrow('Failed to copy image: Error: disk full');

        expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('attempts to remove a partial file when copying a picked image fails', async () => {
        mockCopy.mockImplementationOnce(() => {
            throw new Error('source unavailable');
        });

        await expect(
            copyToLocal({
                uri: 'file:///source.png',
                fileName: 'source.png',
                mimeType: 'image/png',
                width: 1,
                height: 1,
                type: 'image',
                assetId: null,
                base64: null,
                duration: null,
                exif: null,
                fileSize: null,
                pairedVideoAsset: null,
            } as never),
        ).rejects.toThrow('Failed to copy image: Error: source unavailable');

        expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('preserves the original storage error if partial-file cleanup also fails', async () => {
        mockWrite.mockImplementationOnce(() => {
            throw new Error('disk full');
        });
        mockDelete.mockImplementationOnce(() => {
            throw new Error('delete failed');
        });

        await expect(
            saveImageDataToLocal({ mimeType: 'image/png', data: 'aGVsbG8=' }),
        ).rejects.toThrow('Failed to copy image: Error: disk full');
    });
});
