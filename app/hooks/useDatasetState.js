import { generateId } from '../utils/id';
import { DATASET_COLOURS } from '../constants/colours';

export function useDatasetState({
    datasets,
    activeDatasetId,
    setDatasets,
    setSelectedPointRef,
    setActiveDatasetId,
    createEmptyDataset,
    setRenameDatasetVisible,
    setRenameText,
    setColourPickerVisible,
    onDirtyChanged,
}) {
    function handleRenameDataset() {
        const active = datasets.find((d) => d.id === activeDatasetId);

        if (!active) {
            return;
        }

        setRenameText(active.name);
        setRenameDatasetVisible(true);
    }

    function confirmRenameDataset(newName) {
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

    function setDatasetColour(colour) {
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

    function createDuplicateDataset(dataset) {
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

    function toggleCurveVisibility(datasetId) {
        setDatasets((prev) =>
            prev.map((d) => {
                if (d.id !== datasetId) {
                    return d;
                }

                let mode = 'none';

                switch (d.curveMode) {
                    case 'none':
                        mode = 'linear';
                        break;
                    case 'linear':
                        mode = 'spline';
                        break;
                    default:
                        mode = 'none';
                }

                return {
                    ...d,
                    curveMode: mode,
                };
            }),
        );
    }

    function toggleDatasetVisibility(datasetId) {
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

    function toggleDatasetLock(datasetId) {
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
