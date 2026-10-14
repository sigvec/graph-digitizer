/**
 * Returns logical-coordinate deltas that produce approximately equal screen-space
 * movement on both axes for a square 0–100 logical coordinate system.
 *
 * The longer image dimension is scaled down by the image aspect ratio; the
 * shorter dimension retains the base nudge.
 */
export function getAspectRatioNudge(zoomDisplay: number, aspectRatio: number) {
    const baseNudge = 1 / (zoomDisplay > 0 ? zoomDisplay : 1);
    const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;

    return {
        x: baseNudge / Math.max(1, ratio),
        y: baseNudge * Math.min(1, ratio),
    };
}
