import { generateId } from '../utils/id';
import { snapVector } from '../../frontend/services/imageAnalysis/snap';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, TOUCH_RADIUS } from '../constants/geometry';

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
    zoomDisplay,
    nudgeAllPoints,
    onDirtyChanged,
}) {
    const setPointPosition = (id, x, y) => {
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
    const findPointNear = (x, y) => {
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

                // Avoid unnecessary Math.sqrt execution on rendering threads
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
    const finishDragTransaction = (id, x, y) => {
        setPointPosition(id, x, y);

        onDirtyChanged(true);
    };

    // Commit a calibration handle's new location when a gesture finishes
    const finishCalibrationDragTransaction = (dragTarget, x, y) => {
        if (dragTarget === 'origin') {
            setCalibration((prev) => ({
                ...prev,
                origin: { x, y },
            }));
        } else {
            const axis = dragTarget[0]; // "x" or "y"
            const point = dragTarget[1] === '0' ? 'p0' : 'p1';
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

    const addPoint = (x, y) => {
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

        const nudgeVec = snapVector(decodedImage.current, x / LOGICAL_WIDTH, y / LOGICAL_HEIGHT);
        const nudgeX = (nudgeVec?.dx || 0) * LOGICAL_WIDTH;
        const nudgeY = (nudgeVec?.dy || 0) * LOGICAL_HEIGHT;
        const newPoint = { id: addedPointId, x: x + nudgeX, y: y + nudgeY };

        let insertPosition;
        if (activeDataset.points.length <= 1) {
            insertPosition = activeDataset.points.length;
        } else {
            let closestPoint = 0;
            let minDistance =
                (newPoint.x - activeDataset.points[0].x) ** 2 +
                (newPoint.y - activeDataset.points[0].y) ** 2;

            for (let i = 1; i < activeDataset.points.length; i++) {
                const curDistance =
                    (newPoint.x - activeDataset.points[i].x) ** 2 +
                    (newPoint.y - activeDataset.points[i].y) ** 2;
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    closestPoint = i;
                }
            }

            const previousIndex = Math.max(0, closestPoint - 1);
            const currentIndex = previousIndex + 1;
            const previousPoint = activeDataset.points[previousIndex];
            const currentPoint = activeDataset.points[currentIndex];

            const increasing = currentPoint.x >= previousPoint.x;
            const left = newPoint.x < activeDataset.points[closestPoint].x;
            const insertAfter = increasing !== left;

            insertPosition = closestPoint + (insertAfter ? 1 : 0);
        }

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
        const dataset = datasets.find((d) => d.id === selectedPointRef.datasetId);

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

    function nudgePoint(dx, dy) {
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
                        if (!nudgeAllPoints && p.id !== selectedPointRef.pointId) {
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

    function nudgeCalibrationPoint(selection, dx, dy) {
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
            const axis = selection[0]; // "x" or "y"
            const point = selection[1] === '0' ? 'p0' : 'p1';
            const magnitude = axis === 'x' ? dx : dy;

            const newValue = calibration[axis][point] + magnitude;
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

    function updateCalibrationValue(axis, key, value) {
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
        finishDragTransaction,
        finishCalibrationDragTransaction,
        getSelectedPointData,
        handleDeletePoint,
        nudgePoint,
        nudgeCalibrationPoint,
        updateCalibrationValue,
    };
}
