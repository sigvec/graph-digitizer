import { transformPoint } from '../calibration/transform';
import type { Calibration } from '../calibration/types';
import type { Dataset } from '../datasets/types';

function escapeCSVField(value: string): string {
    if (!/[",\r\n]/.test(value)) {
        return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
}

export function generateSimpleCSV(datasets: Dataset[], calibration: Calibration): string {
    const rows = ['series,x,y'];

    datasets.forEach((dataset) => {
        const points = [...dataset.points].sort((a, b) => a.x - b.x);
        const transformedPoints = points
            .map((point) => transformPoint(point, calibration))
            .filter((point) => point !== null);

        transformedPoints.forEach((point) => {
            if (point) {
                rows.push(`${escapeCSVField(dataset.name)},${point.x},${point.y}`);
            }
        });
    });

    return rows.join('\n');
}
