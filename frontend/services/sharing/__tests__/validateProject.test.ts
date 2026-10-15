import { validateProject, validateStoredProject } from '../validateProject';

const validProject = () => ({
    formatVersion: 1,
    name: 'Test project',
    appVersion: '0.7.0',
    device: { platform: 'test', version: '1' },
    image: null,
    datasetCount: 1,
    calibration: {
        origin: { x: 0, y: 0 },
        x: { scaleType: 'linear', p0: null, p1: 100, value0: 0, value1: 10, units: '' },
        y: { scaleType: 'linear', p0: null, p1: 100, value0: 0, value1: 10, units: '' },
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
});

describe('validateProject', () => {
    it('accepts a valid V1 project', () => {
        expect(validateProject(validProject()).valid).toBe(true);
    });

    it('rejects undocumented legacy formats rather than migrating them', () => {
        const legacy = validProject() as Record<string, unknown>;
        legacy.formatVersion = undefined;
        expect(validateProject(legacy)).toMatchObject({ valid: false });
    });

    it('rejects unsupported future format versions', () => {
        const future = validProject() as Record<string, unknown>;
        future.formatVersion = 2;
        expect(validateProject(future)).toMatchObject({ valid: false });
    });

    it('rejects duplicate dataset IDs', () => {
        const project = validProject();
        project.datasets.push({ ...project.datasets[0], name: 'Duplicate' });
        project.datasetCount = 2;
        expect(validateProject(project)).toMatchObject({ valid: false });
    });

    it('rejects non-finite point coordinates', () => {
        const project = validProject();
        project.datasets[0].rawPoints[0].x = Number.NaN;
        expect(validateProject(project)).toMatchObject({ valid: false });
    });

    it('accepts null activeDatasetId', () => {
        const project = validProject();
        (project.uiState as { activeDatasetId: string | null }).activeDatasetId = null;
        expect(validateProject(project).valid).toBe(true);
    });

    it('requires local metadata for a stored project', () => {
        expect(validateStoredProject(validProject())).toMatchObject({ valid: false });
        expect(
            validateStoredProject({
                ...validProject(),
                id: 'local-1',
                createdAt: '2026-10-10T00:00:00.000Z',
                updatedAt: '2026-10-10T00:00:00.000Z',
            }).valid,
        ).toBe(true);
    });
});
