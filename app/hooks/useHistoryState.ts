import { useState, useEffect, useCallback } from 'react';
import { Dataset } from '../datasets/types';
import { Calibration } from '../calibration/types';

interface useHistoryStateProps {
    datasets: Dataset[];
    calibration: Calibration;
    image: string;
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>;
    setCalibration: React.Dispatch<React.SetStateAction<Calibration>>;
    setProjectImage: React.Dispatch<React.SetStateAction<string>>;
    onDirtyChanged: React.Dispatch<React.SetStateAction<boolean>>;
    isProcessingProject: boolean;
}

export function useHistoryState({
    datasets,
    calibration,
    image,
    setDatasets,
    setCalibration,
    setProjectImage,
    onDirtyChanged,
    isProcessingProject,
}: useHistoryStateProps) {
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isRestoringHistory, setIsRestoringHistory] = useState(false);

    const currentSnapshot = { datasets, calibration, image };
    const snapshotString = JSON.stringify(currentSnapshot);

    const commitHistorySnapshot = useCallback(
        (snapshotString: string) => {
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
        // Suppress history commits while state is being restored
        // (project loading, undo/redo, image restoration).
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

    const resetHistory = useCallback((baseSnapshotString: string) => {
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
