import type { CurveMode } from '../datasets/constants';
import type { Coords } from './types';
import { generateSpline } from './generateSpline';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../constants/geometry';

export function pointsToPath(
    points: Coords[],
    imageWidth: number,
    imageHeight: number,
    curveMode: CurveMode,
) {
    'worklet';

    if ((points?.length ?? 0) < 2) {
        return '';
    }

    let curvePoints;

    switch (curveMode) {
        case 'none':
            return null;

        case 'linear':
            curvePoints = points;
            break;

        case 'spline':
            curvePoints = generateSpline(points, 10);
            break;
        default:
            curvePoints = points;
    }

    return curvePoints.reduce((path, p, i) => {
        if (i === 0) {
            return `M${(p.x * imageWidth) / LOGICAL_WIDTH} ${(p.y * imageHeight) / LOGICAL_HEIGHT}`;
        }
        return `${path} L${(p.x * imageWidth) / LOGICAL_WIDTH} ${(p.y * imageHeight) / LOGICAL_HEIGHT}`;
    }, '');
}
