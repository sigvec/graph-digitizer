import type { Project } from "./Project";
import type { ShareResponse } from "./ShareResponse";

import { serializeProject } from "./serializeProject";

import { API_BASE_URL } from "./apiConfig";

export async function shareProject(
    project: Project
): Promise<ShareResponse> {

    const sharedProject =
        await serializeProject(project);

    const response = await fetch(
        `${API_BASE_URL}/shared-projects`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sharedProject),
        }
    );

    if (!response.ok) {
        throw new Error(
            `Share failed (${response.status})`
        );
    }

    const result = await response.json();

    return result
}