import { generateId } from '../utils/id';
import { snapVector } from '../../frontend/services/imageAnalysis/snap';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TOUCH_RADIUS } from '../constants/geometry';
import type { Dataset } from '../datasets/types';
import type {
    Calibration,
    CalibrationAxis,
    NumericCalibrationKey,
    CalibrationSelection,
} from '../calibration/types';
import type { DecodedImage } from '../../frontend/services/imageAnalysis/types';
import type { Point, InteractionMode } from '../types/geometry';

const InsertMode = {
    NearestSegment: 'nearestSegment',
    NearestPoint: 'nearestPoint',
} as const;

export type InsertMode = (typeof InsertMode)[keyof typeof InsertMode];
const INSERT_MODE: InsertMode = InsertMode.NearestSegment;

function distanceSquared(a: Point, b: Point) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;

    return abx * abx + aby * aby;
}

function distanceSquaredToSegment(p: Point, a: Point, b: Point) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;

    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const ab2 = abx * abx + aby * aby;

    if (ab2 === 0) {
        // Degenerate segment
        return apx * apx + apy * apy;
    }

    let t = (apx * abx + apy * aby) / ab2;
    t = Math.max(0, Math.min(1, t));

    const qx = a.x + t * abx;
    const qy = a.y + t * aby;

    const dx = p.x - qx;
    const dy = p.y - qy;

    return dx * dx + dy * dy;
}

function findNearestSegmentInsertPosition(points: Point[], newPoint: Point): number {
    let insertPosition: number = points.length;

    if (points.length <= 1) {
        return insertPosition;
    }

    switch (INSERT_MODE) {
        case InsertMode.NearestSegment:
            let bestDistance = Infinity;

            for (let i = 0; i < points.length - 1; i++) {
                const distance = distanceSquaredToSegment(newPoint, points[i], points[i + 1]);

                if (distance < bestDistance) {
                    bestDistance = distance;
                    insertPosition = i + 1;
                }
            }

            const first = points[0];
            const last = points[points.length - 1];

            const firstDistance = distanceSquared(newPoint, first);
            const lastDistance = distanceSquared(newPoint, last);

            if (firstDistance <= bestDistance) {
                bestDistance = firstDistance;
                insertPosition = 0;
            }
            if (lastDistance <= bestDistance) {
                bestDistance = lastDistance;
                insertPosition = points.length;
            }

            // Favour appending end points
            if (points.length > 2) {
                if (insertPosition === 1) {
                    insertPosition = 0;
                } else if (insertPosition === points.length - 1) {
                    insertPosition = points.length;
                }
            }

            break;

        // Maintain for future use
        case InsertMode.NearestPoint:
            let closestPoint = 0;
            let minDistance = (newPoint.x - points[0].x) ** 2 + (newPoint.y - points[0].y) ** 2;

            for (let i = 1; i < points.length; i++) {
                const curDistance =
                    (newPoint.x - points[i].x) ** 2 + (newPoint.y - points[i].y) ** 2;
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    closestPoint = i;
                }
            }

            const previousIndex = Math.max(0, closestPoint - 1);
            const currentIndex = previousIndex + 1;
            const previousPoint = points[previousIndex];
            const currentPoint = points[currentIndex];

            const increasing = currentPoint.x >= previousPoint.x;
            const left = newPoint.x < points[closestPoint].x;
            const insertAfter = increasing !== left;

            insertPosition = closestPoint + (insertAfter ? 1 : 0);

            break;
    }

    return insertPosition;
}

interface useGraphInteractionProps {
    mode: InteractionMode;
    datasets: Dataset[];
    activeDatasetId: string;
    activeDataset: Dataset;
    decodedImage: DecodedImage;
    calibration: Calibration;
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
    setCalibration: React.Dispatch<React.SetStateAction<Calibration>>;
    setCalibratedState: React.Dispatch<React.SetStateAction<boolean>>;
    selectedPointRef: { datasetId: string; pointId: string } | null;
    setSelectedPointRef: React.Dispatch<
        React.SetStateAction<{ datasetId: string; pointId: string } | null>
    >;
    setActiveDatasetId: React.Dispatch<React.SetStateAction<string>>;
    fitScale: number;
    zoomDisplay: number;
    nudgeAllPoints: boolean;
    onDirtyChanged: (newValue: boolean) => void;
}

export function useGraphInteraction({
    mode,
    datasets,
    activeDatasetId,
    activeDataset,
    decodedImage,
    calibration,
    setDatasets,
    setCalibration,
    setCalibratedState,
    selectedPointRef,
    setSelectedPointRef,
    setActiveDatasetId,
    fitScale,
    zoomDisplay,
    nudgeAllPoints,
    onDirtyChanged,
}: useGraphInteractionProps) {
    const setPointPosition = (id: string, x: number, y: number) => {
        setDatasets((prev) =>
            prev.map((d) =>
                d.id === activeDatasetId
                    ? {
                          ...d,
                          points: (d.points || []).map((p) => (p.id === id ? { ...p, x, y } : p)),
                      }
                    : d,
            ),
        );
    };

    // Spatially search all visible datasets for a matching click vector
    const findPointNear = (x: number, y: number) => {
        const searchRadius = TOUCH_RADIUS / zoomDisplay;

        for (let i = datasets.length - 1; i >= 0; i--) {
            const d = datasets[i];

            if (!d.visible) {
                continue;
            }
            for (let j = d.points.length - 1; j >= 0; j--) {
                const p = d.points[j];

                const dx = p.x - x;
                const dy = p.y - y;

                // Avoid unnecessary Math.sqrt execution
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= searchRadius) {
                    return {
                        datasetId: d.id,
                        pointId: p.id,
                    };
                }
            }
        }

        return null;
    };

    // Commit a point's new coordinates to state when a drag operation ends
    const commitPointDrag = (id: string, x: number, y: number) => {
        setPointPosition(id, x, y);

        onDirtyChanged(true);
    };

    // Commit a calibration handle's new location when a gesture finishes
    const commitCalibrationDrag = (dragTarget: CalibrationSelection, x: number, y: number) => {
        if (dragTarget === 'origin') {
            setCalibration((prev) => ({
                ...prev,
                origin: { x, y },
            }));
        } else {
            const axis = dragTarget[0] as CalibrationAxis; // "x" or "y"
            const point: NumericCalibrationKey = dragTarget[1] === '0' ? 'p0' : 'p1';
            const value = axis === 'x' ? x : y;

            setCalibration((prev) => ({
                ...prev,
                [axis]: {
                    ...prev[axis],
                    [point]: value,
                },
            }));
        }

        setCalibratedState(true);
        onDirtyChanged(true);
    };

    const addPoint = (x: number, y: number) => {
        const hit = findPointNear(x, y);
        if (hit) {
            setSelectedPointRef(hit);
            setActiveDatasetId(hit.datasetId);
            return;
        }

        onDirtyChanged(true);
        setSelectedPointRef(null);

        if (mode !== 'points') {
            const calibrationPoint =
                mode === 'origin' ? { x, y } : mode === 'xRef' ? { x, y: null } : { x: null, y };

            setCalibration((prev) => ({ ...prev, [mode]: calibrationPoint }));
            setCalibratedState(true);
            return;
        }

        if (!activeDataset?.visible || activeDataset?.locked) return;

        const addedPointId = generateId();
        const addedPointRef = { datasetId: activeDatasetId, pointId: addedPointId };

        const nudgeVec = snapVector(
            decodedImage,
            x / LOGICAL_WIDTH,
            y / LOGICAL_HEIGHT,
            1 / (fitScale || 1),
            1 / (zoomDisplay || 1),
        );
        const nudgeX = (nudgeVec?.dx ?? 0) * LOGICAL_WIDTH;
        const nudgeY = (nudgeVec?.dy ?? 0) * LOGICAL_HEIGHT;
        const newPoint = { id: addedPointId, x: x + nudgeX, y: y + nudgeY };

        const insertPosition = findNearestSegmentInsertPosition(activeDataset.points, newPoint);
        setDatasets((prev) =>
            prev.map((d) =>
                d.id === activeDatasetId
                    ? { ...d, points: d.points.toSpliced(insertPosition, 0, newPoint) }
                    : d,
            ),
        );
        setSelectedPointRef(addedPointRef);
    };

    function getSelectedPointData() {
        const dataset = datasets.find((d) => d.id === selectedPointRef?.datasetId);

        return dataset?.points.find((p) => p.id === selectedPointRef?.pointId);
    }

    function handleDeletePoint() {
        const dataset = datasets.find((d) => d.id === selectedPointRef?.datasetId);

        if (dataset?.locked) {
            return;
        }

        if (!selectedPointRef) {
            return;
        }

        onDirtyChanged(true);

        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== selectedPointRef.datasetId) {
                    return d;
                }

                return {
                    ...d,

                    points: d.points.filter((p) => p.id !== selectedPointRef.pointId),
                };
            }),
        );

        setSelectedPointRef(null);
    }

    function nudgePoint(dx: number, dy: number) {
        if (activeDataset.locked) {
            return;
        }

        if (!selectedPointRef && !nudgeAllPoints) {
            return;
        }

        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== activeDatasetId) {
                    return d;
                }

                return {
                    ...d,

                    points: d.points.map((p) => {
                        if (!nudgeAllPoints && p.id !== selectedPointRef?.pointId) {
                            return p;
                        }

                        return {
                            ...p,
                            x: p.x + dx,
                            y: p.y + dy,
                        };
                    }),
                };
            }),
        );

        onDirtyChanged(true);
    }

    function nudgeCalibrationPoint(selection: CalibrationSelection, dx: number, dy: number) {
        if (mode === 'points') {
            return;
        }

        if (selection === 'origin') {
            const newValue = { x: calibration.origin.x + dx, y: calibration.origin.y + dy };
            setCalibration((prev) => ({
                ...prev,
                origin: newValue,
            }));
        } else {
            const axis = selection[0] as CalibrationAxis; // "x" or "y"
            const point: NumericCalibrationKey = selection[1] === '0' ? 'p0' : 'p1';
            const magnitude = axis === 'x' ? dx : dy;

            const currentValue = calibration[axis][point];

            if (currentValue === null) {
                return;
            }

            const newValue = currentValue + magnitude;
            setCalibration((prev) => ({
                ...prev,
                [axis]: {
                    ...prev[axis],
                    [point]: newValue,
                },
            }));
        }

        setCalibratedState(true);

        onDirtyChanged(true);
    }

    function updateCalibrationValue(
        axis: CalibrationAxis,
        key: NumericCalibrationKey,
        value: number,
    ) {
        if (!Number.isFinite(value)) {
            return false;
        }

        setCalibration((prev) => ({
            ...prev,
            [axis]: {
                ...prev[axis],
                [key]: value,
            },
        }));

        return true;
    }

    return {
        addPoint,
        commitPointDrag,
        commitCalibrationDrag,
        getSelectedPointData,
        handleDeletePoint,
        nudgePoint,
        nudgeCalibrationPoint,
        updateCalibrationValue,
    };
}
