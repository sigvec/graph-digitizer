export function toExportFormat(datasets) {
    return datasets.map(d => ({
        id: d.id,
        name: d.name,
        color: d.color,
        rawPoints: d.points || [],
    }));
}

export function fromExportFormat(project) {
    return {
        ...project,
        datasets: (project.datasets || []).map(d => ({
            id: d.id,
            name: d.name,
            color: d.color,
            points: d.rawPoints || [],
        })),
    };
}

export function hydrateProject(project) {
    return {
        ...project,

        datasets: (project.datasets || []).map(d => ({
            id: d.id,
            name: d.name,
            color: d.color,
            visible: d.visible ?? true,
            locked: d.locked ?? false,
            curveMode: d.curveMode ?? 'none',

            // UI format expects "points"
            points: d.rawPoints || [],
        })),
    };
}