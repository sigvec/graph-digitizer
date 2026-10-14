import { getAspectRatioNudge } from './nudge';

describe('getAspectRatioNudge', () => {
    it('keeps both axes equal for square images', () => {
        expect(getAspectRatioNudge(2, 1)).toEqual({ x: 0.5, y: 0.5 });
    });

    it('reduces horizontal logical movement for landscape images', () => {
        expect(getAspectRatioNudge(2, 2)).toEqual({ x: 0.25, y: 0.5 });
    });

    it('reduces vertical logical movement for portrait images', () => {
        expect(getAspectRatioNudge(2, 0.5)).toEqual({ x: 0.5, y: 0.25 });
    });

    it('falls back safely for invalid zoom and aspect ratios', () => {
        expect(getAspectRatioNudge(0, 0)).toEqual({ x: 1, y: 1 });
    });
});
