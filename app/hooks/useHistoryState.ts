import { useState, useEffect, useCallback } from 'react';
import type { Dataset } from '../datasets/types';
import type { Calibration } from '../calibration/types';

type HistorySnapshot = {
    datasets: Dataset[];
    calibration: Calibration;
    image: string | null;
};

interface useHistoryStateProps {
    datasets: Dataset[];
    calibration: Calibration;
    image: string | null;
    setDatasets: (datasets: Dataset[]) => void;
    setCalibration: (calibration: Calibration) => void;
    setProjectImage: (image: string | null) => void;
    onDirtyChanged: (newValue: boolean) => void;
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

    const snapshotString = JSON.stringify({
        datasets,
        calibration,
        image,
    } satisfies HistorySnapshot);

    function restoreSnapshot(snapshotString: string) {
        setIsRestoringHistory(true);

        const snapshot: HistorySnapshot = JSON.parse(snapshotString);

        setDatasets(snapshot.datasets);
        setCalibration(snapshot.calibration);
        setProjectImage(snapshot.image);

        onDirtyChanged(true);
        setIsRestoringHistory(false);
    }

    function handleUndo() {
        if (historyIndex <= 0) return;

        restoreSnapshot(history[historyIndex - 1]);
        setHistoryIndex(historyIndex - 1);
    }

    function handleRedo() {
        if (historyIndex >= history.length - 1) return;

        restoreSnapshot(history[historyIndex + 1]);
        setHistoryIndex(historyIndex + 1);
    }

    const resetHistory = useCallback((baseSnapshotString: string) => {
        setHistory([baseSnapshotString]);
        setHistoryIndex(0);
    }, []);

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

    return {
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        handleUndo,
        handleRedo,
        resetHistory,
    };
}
