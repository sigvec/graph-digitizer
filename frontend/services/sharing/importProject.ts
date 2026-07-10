import type { Project } from "./Project";

import { deserializeProject } from "./deserializeProject";

import { API_BASE_URL } from "./apiConfig";

export async function importProject(
    shareId: string
): Promise<Project> {

    try {

        const response = await fetch(
            `${API_BASE_URL}/shared-projects/${shareId}`,
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

        const project =
            await deserializeProject(result);

        return project

    }
    catch (err) {

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