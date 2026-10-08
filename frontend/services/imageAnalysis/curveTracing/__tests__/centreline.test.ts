import { estimateCentreline } from '../centreline';
import { SyntheticImage } from '../SyntheticImage';
import { setAntiAliasedPixel } from '../renderSyntheticCurve';

describe('estimateCentreline', () => {
    it('estimates the centre of a thick horizontal stroke', () => {
        const image = new SyntheticImage(40, 40);

        for (let y = 16; y <= 24; y += 1) {
            setAntiAliasedPixel(image, 20, y, 1);
        }

        const result = estimateCentreline(image, { x: 20, y: 20 }, { x: 0, y: 1 }, 6);

        expect(result.offset).toBeCloseTo(0, 6);

        expect(result.confidence).toBe(1);
    });

    it('moves toward the stroke centre when starting from an edge', () => {
        const image = new SyntheticImage(40, 40);

        for (let y = 16; y <= 24; y += 1) {
            setAntiAliasedPixel(image, 20, y, 1);
        }

        const result = estimateCentreline(image, { x: 20, y: 23 }, { x: 0, y: 1 }, 6);

        expect(result.offset).toBeCloseTo(-2.5, 1);
    });

    it('estimates the centre of a thick diagonal stroke', () => {
        const image = new SyntheticImage(50, 50);

        for (let x = 10; x <= 30; x += 1) {
            const centreY = 30 - 0.5 * (x - 10);

            for (let offset = -3; offset <= 3; offset += 1) {
                setAntiAliasedPixel(image, x, Math.round(centreY + offset), 1);
            }
        }

        const centre = {
            x: 20,
            y: 25,
        };

        const tangent = {
            x: 1,
            y: -0.5,
        };

        const normal = {
            x: -tangent.y,
            y: tangent.x,
        };

        const result = estimateCentreline(image, centre, normal, 5);

        expect(result.offset).toBeCloseTo(0.5, 1);
    });

    it('points back toward the centre from an offset diagonal position', () => {
        const image = new SyntheticImage(50, 50);

        for (let x = 10; x <= 30; x += 1) {
            const centreY = 30 - 0.5 * (x - 10);

            for (let offset = -3; offset <= 3; offset += 1) {
                setAntiAliasedPixel(image, x, Math.round(centreY + offset), 1);
            }
        }

        const centre = {
            x: 20,
            y: 25,
        };

        const tangent = {
            x: 1,
            y: -0.5,
        };

        const normal = {
            x: -tangent.y,
            y: tangent.x,
        };

        const result = estimateCentreline(
            image,
            {
                x: centre.x + normal.x * 2,
                y: centre.y + normal.y * 2,
            },
            normal,
            5,
        );

        expect(result.offset).toBeLessThan(0);
    });
});
