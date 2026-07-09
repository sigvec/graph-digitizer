import type { Project } from "./Project";

import { deserializeProject } from "./deserializeProject";

import { API_BASE_URL } from "./apiConfig";

export async function importProject(
    shareId: string
): Promise<Project> {

    const response = await fetch(
        `${API_BASE_URL}/shared-projects/${shareId}`,
    );

    if (!response.ok) {
        throw new Error(
            `Import failed (${response.status})`
        );
    }

    const result = await response.json();

    const project =
        await deserializeProject(result);

    return project
}