import type { TraceVector } from './types';

export function directionAlignment(direction: TraceVector, candidate: TraceVector): number {
    const directionLength = Math.sqrt(direction.x ** 2 + direction.y ** 2);

    const candidateLength = Math.sqrt(candidate.x ** 2 + candidate.y ** 2);

    if (directionLength === 0 || candidateLength === 0) {
        return 0;
    }

    return (
        (direction.x * candidate.x + direction.y * candidate.y) /
        (directionLength * candidateLength)
    );
}

export function directionChangeDegrees(direction: TraceVector, candidate: TraceVector): number {
    const alignment = Math.max(-1, Math.min(1, directionAlignment(direction, candidate)));

    return Math.acos(alignment) * (180 / Math.PI);
}
