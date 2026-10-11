import type { StoredProject } from '../../frontend/services/sharing/Project';
import { removeOrphanedImages } from '../../frontend/services/storage/imageStorage';

interface ProjectDeletionDependencies {
    deleteProject: (id: string) => Promise<unknown>;
    loadAllProjects: () => Promise<StoredProject[]>;
    onDeleted: () => void;
}

export async function deleteProjectAndCleanup(
    id: string,
    dependencies: ProjectDeletionDependencies,
): Promise<void> {
    // Do not clean images unless the project record was successfully deleted.
    await dependencies.deleteProject(id);
    dependencies.onDeleted();

    // The project is already deleted. A failed read or cleanup is recoverable;
    // startup maintenance can retry once storage is safe to inspect.
    try {
        const remainingProjects = await dependencies.loadAllProjects();
        await removeOrphanedImages(remainingProjects);
    } catch (error) {
        console.warn('Project deleted, but image cleanup failed:', error);
    }
}
