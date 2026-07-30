import { useState, useEffect, useCallback } from 'react';

export function useHistoryState({
    datasets,
    calibration,
    image,
    setDatasets,
    setCalibration,
    setProjectImage,
    onDirtyChanged,
    isProcessingProject,
}) {
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isRestoringHistory, setIsRestoringHistory] = useState(false);

    const currentSnapshot = { datasets, calibration, image };
    const snapshotString = JSON.stringify(currentSnapshot);

    const commitHistorySnapshot = useCallback(
        (snapshotString) => {
            const latest = history[historyIndex];
            if (snapshotString === latest) return;

            const trimmed = history.slice(0, historyIndex + 1);
            const next = [...trimmed, snapshotString];

            setHistory(next);
            setHistoryIndex(next.length - 1);
        },
        [history, historyIndex],
    );

    useEffect(() => {
        if (isRestoringHistory || isProcessingProject) {
            return;
        }

        commitHistorySnapshot(snapshotString);
    }, [snapshotString, isRestoringHistory, isProcessingProject, commitHistorySnapshot]);

    const handleUndo = useCallback(() => {
        if (historyIndex <= 0) return;

        setIsRestoringHistory(true);

        const previous = JSON.parse(history[historyIndex - 1]);

        setDatasets(previous.datasets);
        setCalibration(previous.calibration);
        setProjectImage(previous.image);
        setHistoryIndex(historyIndex - 1);
        onDirtyChanged(true);

        setIsRestoringHistory(false);
    }, [history, historyIndex, setDatasets, setCalibration, setProjectImage, onDirtyChanged]);

    const handleRedo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;

        setIsRestoringHistory(true);

        const next = JSON.parse(history[historyIndex + 1]);

        setDatasets(next.datasets);
        setCalibration(next.calibration);
        setProjectImage(next.image);
        setHistoryIndex(historyIndex + 1);
        onDirtyChanged(true);

        setIsRestoringHistory(false);
    }, [history, historyIndex, setDatasets, setCalibration, setProjectImage, onDirtyChanged]);

    const resetHistory = useCallback((baseSnapshotString) => {
        setHistory([baseSnapshotString]);
        setHistoryIndex(0);
    }, []);

    return {
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        handleUndo,
        handleRedo,
        resetHistory,
    };
}
