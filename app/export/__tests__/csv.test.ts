import { generateSimpleCSV } from '../csv';
import type { Calibration } from '../../calibration/types';
import type { Dataset } from '../../datasets/types';

const calibration: Calibration = {
    origin: { x: 0, y: 0 },
    x: {
        scaleType: 'linear',
        p0: 0,
        p1: 100,
        value0: 0,
        value1: 10,
        units: '',
    },
    y: {
        scaleType: 'linear',
        p0: 0,
        p1: 100,
        value0: 0,
        value1: 10,
        units: '',
    },
};

function makeDataset(name: string, points: Dataset['points']): Dataset {
    return {
        id: name,
        name,
        colour: '#000000',
        visible: true,
        locked: false,
        curveMode: 'none',
        points,
    };
}

describe('generateSimpleCSV', () => {
    it('exports exactly three columns without an extra trailing column', () => {
        const dataset = makeDataset('Series 1', [
            { id: 'p2', x: 50, y: 50 },
            { id: 'p1', x: 25, y: 75 },
        ]);

        expect(generateSimpleCSV([dataset], calibration)).toBe(
            'series,x,y\nSeries 1,2.5,7.5\nSeries 1,5,5',
        );
    });

    it('escapes commas, quotes, and newlines in series names', () => {
        const dataset = makeDataset('Series, "A"\nnext line', [{ id: 'p1', x: 50, y: 50 }]);

        expect(generateSimpleCSV([dataset], calibration)).toBe(
            'series,x,y\n"Series, ""A""\nnext line",5,5',
        );
    });

    it('exports points from multiple datasets in dataset order', () => {
        const first = makeDataset('First', [{ id: 'p1', x: 50, y: 50 }]);
        const second = makeDataset('Second', [{ id: 'p2', x: 25, y: 75 }]);

        expect(generateSimpleCSV([first, second], calibration)).toBe(
            'series,x,y\nFirst,5,5\nSecond,2.5,7.5',
        );
    });
});
