import type { Project } from "./Project";
import type { ShareResponse } from "./ShareResponse";

import { serializeProject } from "./serializeProject";

import { API_BASE_URL } from "./apiConfig";

export async function shareProject(
    project: Project
): Promise<ShareResponse> {

    try {
        const sharedProject = await serializeProject(project);

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

            switch (response.status) {

                case 404:
                    throw new Error("NOT_FOUND");

                case 500:
                    throw new Error("SERVER");

                default:
                    throw new Error("HTTP");
            }
        }

        const result = await response.json();

        return result

    } catch (err) {

        if (err instanceof Error) {
            console.log(err.message);
            if (err.message === "Network request failed") {
                throw new Error("NETWORK");
            }
        }
        else {
            console.log(err);
        }

        throw err;
    }
}