import { deleteProjectAndCleanup } from '../projectDeletion';
import { removeOrphanedImages } from '../../../frontend/services/storage/imageStorage';

jest.mock('../../../frontend/services/storage/imageStorage', () => ({
    removeOrphanedImages: jest.fn(),
}));

const mockRemoveOrphanedImages = jest.mocked(removeOrphanedImages);

describe('deleteProjectAndCleanup', () => {
    const project = {
        id: 'project-1',
        image: 'file:///images/used.jpg',
    } as never;

    let deleteProject: jest.Mock<Promise<void>, [string]>;
    let loadAllProjects: jest.Mock<Promise<never[]>, []>;
    let onDeleted: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        deleteProject = jest.fn().mockResolvedValue(undefined);
        loadAllProjects = jest.fn().mockResolvedValue([]);
        onDeleted = jest.fn();
        mockRemoveOrphanedImages.mockResolvedValue(undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('does not refresh UI or clean images when deleting the project fails', async () => {
        deleteProject.mockRejectedValue(new Error('storage unavailable'));

        await expect(
            deleteProjectAndCleanup('project-1', {
                deleteProject,
                loadAllProjects,
                onDeleted,
            }),
        ).rejects.toThrow('storage unavailable');

        expect(onDeleted).not.toHaveBeenCalled();
        expect(loadAllProjects).not.toHaveBeenCalled();
        expect(mockRemoveOrphanedImages).not.toHaveBeenCalled();
    });

    it('skips image cleanup when reloading projects fails after deletion', async () => {
        loadAllProjects.mockRejectedValue(new Error('cannot read projects'));

        await expect(
            deleteProjectAndCleanup('project-1', {
                deleteProject,
                loadAllProjects,
                onDeleted,
            }),
        ).resolves.toBeUndefined();

        expect(deleteProject).toHaveBeenCalledWith('project-1');
        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(mockRemoveOrphanedImages).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
            'Project deleted, but image cleanup failed:',
            expect.any(Error),
        );
    });

    it('keeps the project deleted if orphan image cleanup fails', async () => {
        mockRemoveOrphanedImages.mockRejectedValue(new Error('filesystem failure'));

        await expect(
            deleteProjectAndCleanup('project-1', {
                deleteProject,
                loadAllProjects,
                onDeleted,
            }),
        ).resolves.toBeUndefined();

        expect(onDeleted).toHaveBeenCalledTimes(1);
        expect(loadAllProjects).toHaveBeenCalledTimes(1);
        expect(mockRemoveOrphanedImages).toHaveBeenCalledWith([]);
        expect(console.warn).toHaveBeenCalledWith(
            'Project deleted, but image cleanup failed:',
            expect.any(Error),
        );
    });

    it('reloads the remaining projects before invoking orphan cleanup', async () => {
        loadAllProjects.mockResolvedValue([project]);

        await deleteProjectAndCleanup('project-1', {
            deleteProject,
            loadAllProjects,
            onDeleted,
        });

        expect(loadAllProjects).toHaveBeenCalledTimes(1);
        expect(mockRemoveOrphanedImages).toHaveBeenCalledWith([project]);
    });
});
