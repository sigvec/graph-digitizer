import { transformPoint } from '../calibration/transform'
import type { Calibration } from '../calibration/types'
import type { Dataset } from '../datasets/types'

export function generateSimpleCSV(datasets: Dataset[], calibration: Calibration): string {
    let rows = ["series,x,y"];

    datasets.forEach(d => {

        const pts = [...d.points].sort((a, b) => a.x - b.x);
        const transformed = pts.map(p => transformPoint({ x: p.x, y: p.y }, calibration)).filter(Boolean);

        // raw data
        transformed.forEach(p => {
            p && rows.push(`${d.name},${p.x},${p.y},`);
        });
    });

    return rows.join("\n");
}