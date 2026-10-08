import type { TracePoint } from './types';
import type { TracePixel } from './image';
import { SyntheticImage } from './SyntheticImage';

const CURVE_PIXEL: TracePixel = {
    r: 0,
    g: 0,
    b: 0,
    a: 255,
};

function setThickPixel(image: SyntheticImage, x: number, y: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
            if (dx * dx + dy * dy <= radius * radius) {
                image.setPixel(x + dx, y + dy, CURVE_PIXEL);
            }
        }
    }
}

export function setAntiAliasedPixel(
    image: SyntheticImage,
    x: number,
    y: number,
    darkness: number,
): void {
    const value = Math.round(255 * (1 - darkness));

    image.setPixel(x, y, {
        r: value,
        g: value,
        b: value,
        a: 255,
    });
}

export function renderLine(
    width: number,
    height: number,
    start: TracePoint,
    end: TracePoint,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i += 1) {
        const t = steps === 0 ? 0 : i / steps;

        const x = Math.round(start.x + dx * t);
        const y = Math.round(start.y + dy * t);

        image.setPixel(x, y, CURVE_PIXEL);
    }

    return image;
}

export function renderParabola(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    const steps = Math.ceil(Math.abs(xEnd - xStart) * 4);

    for (let i = 0; i <= steps; i += 1) {
        const t = steps === 0 ? 0 : i / steps;

        const x = xStart + (xEnd - xStart) * t;

        const offset = x - vertexX;

        const y = vertexY + curvature * offset * offset;

        image.setPixel(Math.round(x), Math.round(y), CURVE_PIXEL);
    }

    return image;
}

export function renderThickParabola(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
    lineWidth: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    const steps = Math.ceil(Math.abs(xEnd - xStart) * 4);

    const radius = Math.max(0, Math.floor(lineWidth / 2));

    for (let i = 0; i <= steps; i += 1) {
        const t = steps === 0 ? 0 : i / steps;

        const x = xStart + (xEnd - xStart) * t;

        const offset = x - vertexX;

        const y = vertexY + curvature * offset * offset;

        setThickPixel(image, Math.round(x), Math.round(y), radius);
    }

    return image;
}

export function renderAntiAliasedParabola(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
    lineWidth: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    const halfWidth = lineWidth / 2;
    const antiAliasWidth = 1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (x < xStart || x > xEnd) {
                continue;
            }

            const offset = x - vertexX;

            const curveY = vertexY + curvature * offset * offset;

            const distanceFromCurve = Math.abs(y - curveY);

            const outerRadius = halfWidth + antiAliasWidth;

            if (distanceFromCurve > outerRadius) {
                continue;
            }

            let darkness: number;

            if (distanceFromCurve <= halfWidth) {
                darkness = 1;
            } else {
                const edgeDistance = distanceFromCurve - halfWidth;

                darkness = 1 - edgeDistance / antiAliasWidth;
            }

            setAntiAliasedPixel(image, x, y, Math.max(0, Math.min(1, darkness)));
        }
    }

    return image;
}

export function renderParabolaWithParallelDistractor(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
    distractorOffset: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    for (let x = xStart; x <= xEnd; x += 1) {
        const offset = x - vertexX;
        const curveY = vertexY + curvature * offset * offset;

        const distractorY = curveY + distractorOffset;

        setAntiAliasedPixel(image, x, Math.round(curveY), 0.6);

        setAntiAliasedPixel(image, x, Math.round(distractorY), 1);
    }

    return image;
}

export function renderParabolaWithSharpDistractor(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    for (let x = xStart; x <= xEnd; x += 1) {
        const offset = x - vertexX;
        const curveY = vertexY + curvature * offset * offset;

        setAntiAliasedPixel(image, x, Math.round(curveY), 0.6);

        // A nearby distractor that initially follows the curve,
        // then bends sharply away from it.
        const distractorOffset = x < vertexX + 10 ? 2 : 2 + (x - (vertexX + 10)) * 1.5;

        const distractorY = curveY + distractorOffset;

        setAntiAliasedPixel(image, x, Math.round(distractorY), 1);
    }

    return image;
}

export function renderSharpBendCurve(
    width: number,
    height: number,
    xStart: number,
    bendX: number,
    bendY: number,
    yEnd: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    for (let x = xStart; x <= bendX; x += 1) {
        const y = bendY - (bendX - x);
        setAntiAliasedPixel(image, x, Math.round(y), 1);
    }

    for (let y = bendY; y <= yEnd; y += 1) {
        setAntiAliasedPixel(image, bendX, y, 1);
    }

    return image;
}

export function renderParabolaWithDivergingDistractor(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    for (let x = xStart; x <= xEnd; x += 1) {
        const offset = x - vertexX;

        const curveY = vertexY + curvature * offset * offset;

        setAntiAliasedPixel(image, x, Math.round(curveY), 0.6);

        // The distractor initially stays close to
        // the real curve, then progressively diverges.
        const distractorOffset = x < vertexX ? 2 : 2 + (x - vertexX) * 0.5;

        const distractorY = curveY + distractorOffset;

        setAntiAliasedPixel(image, x, Math.round(distractorY), 1);
    }

    return image;
}

export function renderParabolaWithGrid(
    width: number,
    height: number,
    xStart: number,
    xEnd: number,
    vertexX: number,
    vertexY: number,
    curvature: number,
    gridX: number | null,
    gridY: number | null,
    curveDarkness: number,
    gridDarkness: number,
    gridRadius: number,
): SyntheticImage {
    const image = new SyntheticImage(width, height);

    for (let x = xStart; x <= xEnd; x += 1) {
        const offset = x - vertexX;
        const curveY = vertexY + curvature * offset * offset;

        setAntiAliasedPixel(image, x, Math.round(curveY), curveDarkness);
    }

    if (gridX !== null) {
        for (let y = 0; y < height; y += 1) {
            for (let dx = -gridRadius; dx <= gridRadius; dx += 1) {
                setAntiAliasedPixel(image, gridX + dx, y, gridDarkness);
            }
        }
    }

    if (gridY !== null) {
        for (let x = 0; x < width; x += 1) {
            for (let dy = -gridRadius; dy <= gridRadius; dy += 1) {
                setAntiAliasedPixel(image, x, gridY + dy, gridDarkness);
            }
        }
    }

    return image;
}
