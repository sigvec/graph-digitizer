export function hydrateProject(project) {
    return {
        ...project,

        datasets: (project.datasets || []).map(d => ({
            id: d.id,
            name: d.name,
            colour: d.colour ?? d.color,
            visible: d.visible ?? true,
            locked: d.locked ?? false,
            curveMode: d.curveMode ?? 'none',

            // UI format expects "points"
            points: d.rawPoints || [],
        })),
    };
}