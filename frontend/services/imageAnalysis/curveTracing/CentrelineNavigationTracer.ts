import type { TraceImage } from './image';
import { estimateCentreline } from './centreline';
import { darkness, luminance } from './imageMetrics';
import { directionChangeDegrees } from './directionalContinuity';
import type { TraceOptions, TracePoint, TraceResult, TraceVector } from './types';

const MAX_DIRECTION_CHANGE_DEGREES = 30;
const PROGRESS_HISTORY_LENGTH = 6;
const MIN_FORWARD_PROGRESS = 0.25;
const ENDPOINT_MIN_POINTS = 12;
const ENDPOINT_LOOKAHEAD_START = 4;
const ENDPOINT_LOOKAHEAD_END = 6;
const ENDPOINT_MIN_SUPPORT = 0.15;

function length(vector: TraceVector): number {
    return Math.hypot(vector.x, vector.y);
}

function normalize(vector: TraceVector): TraceVector {
    const magnitude = length(vector);

    return magnitude === 0
        ? { x: 0, y: 0 }
        : {
              x: vector.x / magnitude,
              y: vector.y / magnitude,
          };
}

function forwardContinuationSupport(
    image: TraceImage,
    point: TracePoint,
    direction: TraceVector,
    transverseRadius: number,
): number {
    const tangent = normalize(direction);

    if (length(tangent) === 0) return 0;

    const normal = {
        x: -tangent.y,
        y: tangent.x,
    };

    let best = 0;

    for (
        let distance = ENDPOINT_LOOKAHEAD_START;
        distance <= ENDPOINT_LOOKAHEAD_END;
        distance += 1
    ) {
        for (let transverse = -transverseRadius; transverse <= transverseRadius; transverse += 1) {
            const x = Math.round(point.x + tangent.x * distance + normal.x * transverse);
            const y = Math.round(point.y + tangent.y * distance + normal.y * transverse);

            if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
                continue;
            }

            best = Math.max(best, darkness(luminance(image.getPixel(x, y))));
        }
    }

    return best;
}

function correctToCentreline(
    image: TraceImage,
    point: TracePoint,
    tangent: TraceVector,
    radius: number,
): { point: TracePoint; confidence: number } {
    const normal = {
        x: -tangent.y,
        y: tangent.x,
    };

    const normalLength = length(normal);

    if (normalLength === 0) {
        return {
            point,
            confidence: 0,
        };
    }

    const estimate = estimateCentreline(image, point, normal, radius);

    const n = {
        x: normal.x / normalLength,
        y: normal.y / normalLength,
    };

    return {
        point: {
            x: point.x + n.x * estimate.offset,
            y: point.y + n.y * estimate.offset,
        },
        confidence: estimate.confidence,
    };
}

export class CentrelineNavigationTracer {
    trace(
        image: TraceImage,
        start: TracePoint,
        direction: TraceVector,
        options: TraceOptions,
    ): TraceResult {
        const points: TracePoint[] = [start];
        const navigationPoints: TracePoint[] = [start];
        const confidence: number[] = [1];

        let currentDirection = normalize(direction);

        if (length(currentDirection) === 0) {
            return {
                points,
                confidence,
                termination: 'low_confidence',
                navigationPoints,
            };
        }

        /*
         * `current` is the point used for navigation.
         *
         * It is intentionally NOT updated to the centreline-corrected point.
         *
         * The corrected point is an output estimate. It may be displaced by
         * transverse structures such as gridlines, so allowing it to become
         * the navigation state lets a gridline redirect the tracer.
         */
        let current = start;

        for (let step = 1; step < options.maxPoints; step += 1) {
            /*
             * Estimate the tangent from a multi-step navigation chord, not
             * from the most recent raw pixel displacement. Pixel-level choices
             * can be biased to one side of a thick stroke; feeding each choice
             * straight back into the heading lets small errors accumulate into
             * a completely different direction.
             *
             * During the first few steps, retain the user-supplied direction.
             * The history chord is not reliable until enough navigation points
             * have accumulated to average out rasterisation noise.
             */
            const historyStart = Math.max(0, navigationPoints.length - PROGRESS_HISTORY_LENGTH);
            const historyAnchor = navigationPoints[historyStart];
            const progressVector = {
                x: current.x - historyAnchor.x,
                y: current.y - historyAnchor.y,
            };
            const historyDirection =
                length(progressVector) >= 0.5 ? normalize(progressVector) : currentDirection;
            const hasStableHistory = navigationPoints.length >= PROGRESS_HISTORY_LENGTH;
            const progressDirection = hasStableHistory
                ? normalize({
                      x: 0.25 * currentDirection.x + 0.75 * historyDirection.x,
                      y: 0.25 * currentDirection.y + 0.75 * historyDirection.y,
                  })
                : currentDirection;

            const predicted = {
                x: current.x + progressDirection.x * options.stepSize,
                y: current.y + progressDirection.y * options.stepSize,
            };

            /*
             * Check for a curve endpoint before selecting the next pixel.
             *
             * Previously this check ran only when candidate selection failed.
             * At a sharp endpoint, a connected axis or other feature can still
             * provide candidates, causing the tracer to turn onto that feature
             * instead of ending the trace. Look ahead along the established
             * tangent; if the stroke does not continue there, stop before the
             * competing feature can redirect navigation.
             */
            if (
                points.length >= ENDPOINT_MIN_POINTS &&
                forwardContinuationSupport(
                    image,
                    current,
                    progressDirection,
                    Math.max(options.searchRadius, 2),
                ) < ENDPOINT_MIN_SUPPORT
            ) {
                return {
                    points,
                    confidence,
                    termination: 'curve_end',
                    navigationPoints,
                };
            }

            let best: {
                raw: TracePoint;
                corrected: TracePoint;
                confidence: number;
                score: number;
            } | null = null;

            const minX = Math.floor(predicted.x - options.searchRadius);
            const maxX = Math.ceil(predicted.x + options.searchRadius);
            const minY = Math.floor(predicted.y - options.searchRadius);
            const maxY = Math.ceil(predicted.y + options.searchRadius);

            for (let y = minY; y <= maxY; y += 1) {
                for (let x = minX; x <= maxX; x += 1) {
                    if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
                        continue;
                    }

                    const displacement = {
                        x: x - current.x,
                        y: y - current.y,
                    };

                    const forwardDistance =
                        displacement.x * progressDirection.x + displacement.y * progressDirection.y;

                    if (forwardDistance <= 0) continue;

                    const distanceFromPrediction = Math.hypot(x - predicted.x, y - predicted.y);

                    if (distanceFromPrediction > options.searchRadius) continue;

                    if (
                        directionChangeDegrees(progressDirection, displacement) >
                        MAX_DIRECTION_CHANGE_DEGREES
                    )
                        continue;

                    const pixelDarkness = darkness(luminance(image.getPixel(x, y)));

                    const corrected = correctToCentreline(
                        image,
                        { x, y },
                        progressDirection,
                        options.searchRadius,
                    );

                    if (corrected.confidence < 0.05 && pixelDarkness < 0.05) continue;

                    const centreDistance = Math.hypot(
                        corrected.point.x - predicted.x,
                        corrected.point.y - predicted.y,
                    );

                    /*
                     * Score the inferred centre rather than the arbitrary dark
                     * pixel used to sample it.
                     */
                    const distanceScore = Math.max(
                        0,
                        1 - centreDistance / (options.searchRadius + 1),
                    );

                    const darknessScore = pixelDarkness;
                    const confidenceScore = corrected.confidence;

                    const forwardScore = Math.min(
                        1,
                        forwardDistance / Math.max(options.stepSize, 1),
                    );

                    const score =
                        0.55 * distanceScore +
                        0.25 * confidenceScore +
                        0.15 * darknessScore +
                        0.05 * forwardScore;

                    if (best === null || score > best.score) {
                        best = {
                            raw: { x, y },
                            corrected: corrected.point,
                            confidence: corrected.confidence,
                            score,
                        };
                    }
                }
            }

            if (best === null) {
                return {
                    points,
                    confidence,
                    termination: 'low_confidence',
                    navigationPoints,
                };
            }

            /*
             * The centreline estimate is the tracing state, not merely an
             * output correction. The next prediction must start from the
             * centre found at this step; otherwise navigation can drift along
             * one edge of the stroke while the displayed path is corrected
             * separately.
             */
            const centreDirection = {
                x: best.corrected.x - current.x,
                y: best.corrected.y - current.y,
            };
            const centreDirectionLength = length(centreDirection);

            if (centreDirectionLength >= 0.25) {
                const centreDirectionNormalized = normalize(centreDirection);
                const centreTurn = directionChangeDegrees(
                    progressDirection,
                    centreDirectionNormalized,
                );

                // Let the centreline steer the next step, while rejecting an
                // implausible one-step turn caused by a crossing or artefact.
                if (centreTurn <= MAX_DIRECTION_CHANGE_DEGREES) {
                    currentDirection = centreDirectionNormalized;
                } else {
                    currentDirection = progressDirection;
                }
            } else {
                // A nearly stationary correction should not collapse the
                // heading; retain the current forward prediction instead.
                currentDirection = progressDirection;
            }

            current = best.corrected;
            points.push(best.corrected);
            navigationPoints.push(best.corrected);
            confidence.push(best.confidence);
        }

        return {
            points,
            confidence,
            termination: 'max_length',
            navigationPoints,
        };
    }
}
