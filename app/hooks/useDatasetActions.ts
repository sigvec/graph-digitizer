import { generateId } from '../utils/id';
import { DATASET_COLOURS } from '../constants/colours';
import type { Dataset } from '../datasets/types';
import { CurveMode } from '../datasets/constants';
import { Point } from '../types/geometry';

export function createEmptyDataset(index = 0): Dataset {
    return {
        id: generateId(),
        name: `Curve ${index + 1}`,
        colour: DATASET_COLOURS[index % DATASET_COLOURS.length],
        visible: true,
        locked: false,
        curveMode: CurveMode.NONE,
        points: [] as Point[],
    };
}

export function createDuplicateDataset(dataset: Dataset, existingDatasets: Dataset[]) {
    const usedColours = existingDatasets.map((d) => d.colour);

    const newColour = DATASET_COLOURS.find((c) => !usedColours.includes(c)) ?? DATASET_COLOURS[0];

    return {
        ...dataset,
        id: generateId(),
        name: dataset.name + ' Copy',
        colour: newColour,
        points: dataset.points.map((p) => ({
            ...p,
            id: generateId(),
        })),
    };
}

interface useDatasetStateProps {
    datasets: Dataset[];
    activeDatasetId: string | null;
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
    clearSelectedPoint: () => void;
    setActiveDatasetId: (activeDatasetId: string) => void;
    onDirtyChanged: (newValue: boolean) => void;
}

export function useDatasetActions({
    datasets,
    activeDatasetId,
    setDatasets,
    clearSelectedPoint,
    setActiveDatasetId,
    onDirtyChanged,
}: useDatasetStateProps) {
    function renameDataset(newName: string) {
        const name = newName.trim();

        if (!name) {
            return;
        }

        setDatasets((prev) =>
            prev.map((d) =>
                d.id === activeDatasetId
                    ? {
                          ...d,
                          name,
                      }
                    : d,
            ),
        );

        onDirtyChanged(true);
    }

    function setDatasetColour(colour: string) {
        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== activeDatasetId) {
                    return d;
                }

                return {
                    ...d,
                    colour,
                };
            }),
        );

        onDirtyChanged(true);
    }

    function deleteDataset() {
        let updated = datasets.filter((d) => d.id !== activeDatasetId);

        if (updated.length === 0) {
            updated = [createEmptyDataset(0)];
        }

        setDatasets(updated);

        setActiveDatasetId(updated[0].id);

        clearSelectedPoint();
        onDirtyChanged(true);
    }

    function toggleCurveVisibility(datasetId: string) {
        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== datasetId) {
                    return d;
                }

                let mode: CurveMode = CurveMode.NONE;

                switch (d.curveMode) {
                    case CurveMode.NONE:
                        mode = CurveMode.LINEAR;
                        break;
                    case CurveMode.LINEAR:
                        mode = CurveMode.SPLINE;
                        break;
                    default:
                        mode = CurveMode.NONE;
                }

                return {
                    ...d,
                    curveMode: mode,
                };
            }),
        );
        onDirtyChanged(true);
    }

    function toggleDatasetVisibility(datasetId: string) {
        if (datasetId === activeDatasetId) {
            clearSelectedPoint();
        }

        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== datasetId) {
                    return d;
                }

                return {
                    ...d,
                    visible: !d.visible,
                };
            }),
        );
        onDirtyChanged(true);
    }

    function toggleDatasetLock(datasetId: string) {
        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== datasetId) {
                    return d;
                }

                return {
                    ...d,
                    locked: !d.locked,
                };
            }),
        );
        onDirtyChanged(true);
    }

    return {
        renameDataset,
        setDatasetColour,
        deleteDataset,
        toggleCurveVisibility,
        toggleDatasetVisibility,
        toggleDatasetLock,
    };
}
