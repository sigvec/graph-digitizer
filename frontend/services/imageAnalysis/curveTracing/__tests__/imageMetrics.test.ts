import { darkness, luminance } from '../imageMetrics';

describe('luminance', () => {
    it('returns 0 for black', () => {
        expect(
            luminance({
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            }),
        ).toBeCloseTo(0);
    });

    it('returns 255 for white', () => {
        expect(
            luminance({
                r: 255,
                g: 255,
                b: 255,
                a: 255,
            }),
        ).toBeCloseTo(255);
    });
});

describe('darkness', () => {
    it('returns 1 for black', () => {
        expect(darkness(0)).toBeCloseTo(1);
    });

    it('returns 0 for white', () => {
        expect(darkness(255)).toBeCloseTo(0);
    });

    it('returns 0.5 for mid-grey', () => {
        expect(darkness(127.5)).toBeCloseTo(0.5);
    });
});
