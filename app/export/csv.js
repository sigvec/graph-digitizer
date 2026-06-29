import transformPoint from '../calibration/transform'

export function generateSimpleCSV(datasets, calibration) {
    let rows = ["series,x,y"];

    datasets.forEach(d => {

        const pts = [...d.points].sort((a, b) => a.x - b.x);
        const transformed = pts.map(p => transformPoint(p, calibration)).filter(Boolean);

        // raw data
        transformed.forEach(p => {
            rows.push(`${d.name},${p.x},${p.y},`);
        });
    });

    return rows.join("\n");
}