import { validateSharedProject } from '../validateSharedProject';

const validSharedProject = () => ({
    formatVersion: 1,
    name: 'Shared test project',
    appVersion: '0.7.0',
    device: { platform: 'test', version: '1' },
    image: { mimeType: 'image/png', data: 'aGVsbG8=' },
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

describe('validateSharedProject', () => {
    it('accepts a valid V1 shared project without local-only datasetCount', () => {
        expect(validateSharedProject(validSharedProject()).valid).toBe(true);
    });

    it('accepts a null image', () => {
        const project = validSharedProject() as Record<string, unknown>;
        project.image = null;
        expect(validateSharedProject(project).valid).toBe(true);
    });

    it('rejects a local image URI in a shared payload', () => {
        const project = validSharedProject() as Record<string, unknown>;
        project.image = 'file:///local/image.png';
        expect(validateSharedProject(project)).toMatchObject({ valid: false });
    });

    it('rejects an image without MIME type or data', () => {
        const project = validSharedProject() as Record<string, unknown>;
        project.image = { mimeType: '', data: '' };
        expect(validateSharedProject(project)).toMatchObject({ valid: false });
    });

    it('rejects invalid shared-project structure', () => {
        const project = validSharedProject() as Record<string, unknown>;
        project.formatVersion = 2;
        expect(validateSharedProject(project)).toMatchObject({ valid: false });
    });
});
