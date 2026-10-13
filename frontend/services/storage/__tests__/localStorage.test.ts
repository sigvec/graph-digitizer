import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    loadAllProjects,
    loadAllProjectsForCleanup,
    loadProject,
    updateProject,
} from '../localStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getAllKeys: jest.fn(),
        multiGet: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn(),
    },
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const validProject = (id: string) => ({
    formatVersion: 1,
    name: `Project ${id}`,
    appVersion: '0.6.0',
    device: { platform: 'test', version: '1' },
    image: null,
    calibration: {
        origin: { x: 0, y: 0 },
        x: { scaleType: 'linear' as const, p0: null, p1: 1, value0: 0, value1: 1, units: '' },
        y: { scaleType: 'linear' as const, p0: null, p1: 1, value0: 0, value1: 1, units: '' },
    },
    calibratedState: false,
    datasets: [],
    datasetCount: 0,
    uiState: {
        mode: 'points',
        zoomDisplay: 1,
        translateXscaled: 0,
        translateYscaled: 0,
        activeDatasetId: null,
        showRegressionLine: false,
    },
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('loadAllProjects storage consistency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('skips an invalid JSON project while returning valid projects', async () => {
        const valid = validProject('healthy');
        mockStorage.getAllKeys.mockResolvedValue(['project:broken', 'project:healthy']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:broken', '{'],
            ['project:healthy', JSON.stringify(valid)],
        ] as never);

        await expect(loadAllProjects()).resolves.toEqual([valid]);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Cannot load project record project:broken: invalid JSON'),
        );
    });

    it('skips a schema-invalid project while returning valid projects', async () => {
        const valid = validProject('healthy');
        mockStorage.getAllKeys.mockResolvedValue(['project:broken', 'project:healthy']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:broken', JSON.stringify({ id: 'broken' })],
            ['project:healthy', JSON.stringify(valid)],
        ] as never);

        await expect(loadAllProjects()).resolves.toEqual([valid]);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining('Cannot migrate project record project:broken:'),
        );
    });

    it('skips unsupported future-version projects in lists but keeps cleanup strict', async () => {
        const future = { ...validProject('future'), formatVersion: 2 };
        mockStorage.getAllKeys.mockResolvedValue(['project:future']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:future', JSON.stringify(future)],
        ] as never);

        await expect(loadAllProjects()).resolves.toEqual([]);
        await expect(loadAllProjectsForCleanup()).rejects.toThrow(
            'Cannot migrate project record project:future',
        );
    });

    it('skips a project whose stored id does not match its storage key', async () => {
        const mismatched = validProject('different-id');
        const healthy = validProject('healthy');
        mockStorage.getAllKeys.mockResolvedValue(['project:expected-id', 'project:healthy']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:expected-id', JSON.stringify(mismatched)],
            ['project:healthy', JSON.stringify(healthy)],
        ] as never);

        await expect(loadAllProjects()).resolves.toEqual([healthy]);
        expect(console.warn).toHaveBeenCalledWith(
            expect.stringContaining(
                'stored id different-id does not match storage key id expected-id',
            ),
        );
    });

    it('keeps cleanup strict when a stored id does not match its storage key', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['project:expected-id']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:expected-id', JSON.stringify(validProject('different-id'))],
        ] as never);

        await expect(loadAllProjectsForCleanup()).rejects.toThrow(
            'stored id different-id does not match storage key id expected-id',
        );
    });

    it('rejects loading a project when its stored id differs from the requested id', async () => {
        mockStorage.getItem.mockResolvedValue(JSON.stringify(validProject('different-id')));

        await expect(loadProject('requested-id')).rejects.toThrow("Couldn't load project");
        expect(console.warn).toHaveBeenCalledWith(
            'Failed to load project requested-id:',
            expect.objectContaining({
                message: 'Stored project id different-id does not match requested id requested-id',
            }),
        );
    });

    it('does not overwrite a stored project whose id differs from the storage key', async () => {
        mockStorage.getItem.mockResolvedValue(JSON.stringify(validProject('different-id')));

        await expect(updateProject('requested-id', validProject('incoming'))).rejects.toThrow(
            'stored id different-id does not match storage key id requested-id',
        );
        expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('rejects a project key whose value is missing from multiGet', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['project:missing']);
        mockStorage.multiGet.mockResolvedValue([['project:missing', null]] as never);

        await expect(loadAllProjects()).rejects.toThrow(
            'Cannot safely load project record project:missing: missing value',
        );
    });

    it('ignores non-project keys', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['settings:theme']);
        mockStorage.multiGet.mockResolvedValue([]);

        await expect(loadAllProjects()).resolves.toEqual([]);
        expect(mockStorage.multiGet).toHaveBeenCalledWith([]);
    });

    it('rejects a multiGet result that omits a requested project key', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['project:one', 'project:two']);
        mockStorage.multiGet.mockResolvedValue([['project:one', null]] as never);

        await expect(loadAllProjects()).rejects.toThrow(
            'Cannot safely load projects: multiGet returned an incomplete or inconsistent result',
        );
    });

    it('rejects duplicate or unexpected keys in the multiGet result', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['project:one']);
        mockStorage.multiGet.mockResolvedValue([
            ['project:one', null],
            ['project:one', null],
        ] as never);

        await expect(loadAllProjects()).rejects.toThrow(
            'Cannot safely load projects: multiGet returned an incomplete or inconsistent result',
        );
    });

    it('keeps cleanup snapshots strict when a project is corrupt', async () => {
        mockStorage.getAllKeys.mockResolvedValue(['project:broken']);
        mockStorage.multiGet.mockResolvedValue([['project:broken', '{']] as never);

        await expect(loadAllProjectsForCleanup()).rejects.toThrow(
            'Cannot load project record project:broken: invalid JSON',
        );
    });
});
