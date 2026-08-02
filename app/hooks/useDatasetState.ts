import { generateId } from '../utils/id';
import { DATASET_COLOURS } from '../constants/colours';
import type { Dataset } from '../datasets/types';
import { CurveMode } from '../datasets/constants';

export function createEmptyDataset(index = 0) {
    return {
        id: generateId(),
        name: `Curve ${index + 1}`,
        colour: DATASET_COLOURS[index % DATASET_COLOURS.length],
        visible: true,
        locked: false,
        curveMode: CurveMode.NONE,
        points: [],
    };
}

interface useDatasetStateProps {
    datasets: Dataset[];
    activeDatasetId: string;
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
    setSelectedPointRef: React.Dispatch<
        React.SetStateAction<{ datasetId: string; pointId: string } | null>
    >;
    setActiveDatasetId: React.Dispatch<React.SetStateAction<string>>;
    setRenameDatasetVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setRenameText: React.Dispatch<React.SetStateAction<string>>;
    setColourPickerVisible: React.Dispatch<React.SetStateAction<boolean>>;
    onDirtyChanged: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDatasetState({
    datasets,
    activeDatasetId,
    setDatasets,
    setSelectedPointRef,
    setActiveDatasetId,
    setRenameDatasetVisible,
    setRenameText,
    setColourPickerVisible,
    onDirtyChanged,
}: useDatasetStateProps) {
    function handleRenameDataset() {
        const active = datasets.find((d) => d.id === activeDatasetId);

        if (!active) {
            return;
        }

        setRenameText(active.name);
        setRenameDatasetVisible(true);
    }

    function confirmRenameDataset(newName: string) {
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
        setColourPickerVisible(false);
    }

    function handleDeleteDataset() {
        let updated = datasets.filter((d) => d.id !== activeDatasetId);

        if (updated.length === 0) {
            updated = [createEmptyDataset(0)];
        }

        setDatasets(updated);

        setActiveDatasetId(updated[0].id);

        setSelectedPointRef(null);
        onDirtyChanged(true);
    }

    function createDuplicateDataset(dataset: Dataset) {
        const usedColours = datasets.map((d) => d.colour);

        const newColour =
            DATASET_COLOURS.find((c) => !usedColours.includes(c)) ?? DATASET_COLOURS[0];

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
    }

    function toggleDatasetVisibility(datasetId: string) {
        if (datasetId === activeDatasetId) {
            setSelectedPointRef(null);
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
    }

    return {
        handleRenameDataset,
        confirmRenameDataset,
        setDatasetColour,
        handleDeleteDataset,
        createDuplicateDataset,
        toggleCurveVisibility,
        toggleDatasetVisibility,
        toggleDatasetLock,
    };
}
