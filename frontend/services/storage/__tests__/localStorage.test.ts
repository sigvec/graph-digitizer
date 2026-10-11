import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAllProjects, loadAllProjectsForCleanup } from '../localStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
        getAllKeys: jest.fn(),
        multiGet: jest.fn(),
    },
}));

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const validProject = (id: string) => ({
    formatVersion: 1,
    name: `Project ${id}`,
    appVersion: '0.5.2',
    device: { platform: 'test', version: '1' },
    image: null,
    calibration: {
        origin: { x: 0, y: 0 },
        x: { scaleType: 'linear', p0: null, p1: 1, value0: 0, value1: 1, units: '' },
        y: { scaleType: 'linear', p0: null, p1: 1, value0: 0, value1: 1, units: '' },
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
            expect.stringContaining('Cannot load project record project:broken:'),
        );
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
