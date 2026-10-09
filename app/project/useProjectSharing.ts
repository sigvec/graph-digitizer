import { useRef } from 'react';

import type { ProjectExportData, LastShare } from './types';
import { buildProjectExport } from './export';
import { shareProject } from '../../frontend/services/sharing/shareProject';
import { importProject } from '../../frontend/services/sharing/importProject';
import type { ShareResponse } from '../../frontend/services/sharing/ShareResponse';
import type { Project, StoredProject } from '../../frontend/services/sharing/Project';
import type { SaveProjectResponse } from '../../frontend/services/storage/SaveProjectResponse';

interface ProjectSharingProps {
    projectData: ProjectExportData;
    setDialogPayload: (share: {
        type: string | null;
        title?: string;
        shareResponse?: ShareResponse;
        name?: string;
        message?: string;
    }) => void;
    setLastShare: (share: LastShare | undefined) => void;
    onDirtyChanged: (newValue: boolean) => void;
    handleSaveAs: (
        newName: string,
        inputProject?: Project,
    ) => Promise<SaveProjectResponse | undefined>;
    setIncomingProject: (project: StoredProject) => void;
}

export function useProjectSharing({
    projectData,
    setDialogPayload,
    setLastShare,
    onDirtyChanged,
    handleSaveAs,
    setIncomingProject,
}: ProjectSharingProps) {
    const shareBusy = useRef(false);
    const networkTimedOut = useRef(false);

    async function handleShareProject() {
        const project = buildProjectExport(projectData);

        if (shareBusy.current) {
            return;
        }

        shareBusy.current = true;

        const controller = new AbortController();
        networkTimedOut.current = false;

        const timeout = setTimeout(() => {
            networkTimedOut.current = true;
            controller.abort();
        }, 30000);

        try {
            const share = await shareProject(project, controller.signal);

            setDialogPayload({
                type: 'share-success',
                shareResponse: share,
            });
            const now = new Date().toISOString();

            setLastShare({
                shareId: share.shareId,
                sharedAt: now,
            });

            onDirtyChanged(true);
        } catch (err) {
            let message =
                'Unable to connect to the sharing service. Please check your internet connection and try again.';
            if (err instanceof Error) {
                switch (err.message) {
                    case 'TOO_BIG':
                        message =
                            'This project is too large to be shared. Try reducing the image resolution before sharing.';
                        console.warn(err);
                        break;

                    case 'REQUESTED_ABORT':
                        if (networkTimedOut.current) {
                            message =
                                'The request timed out. Please check your internet connection and try again.';
                        } else {
                            message = 'Upload cancelled.';
                        }
                        console.warn(err);
                        break;

                    case 'NETWORK':
                        message =
                            'Unable to connect to the sharing service. Please check your internet connection and try again.';
                        console.warn(err);
                        break;

                    case 'SERVER':
                        message =
                            'The sharing service is currently unavailable. Please try again later';
                        console.warn(err);
                        break;

                    case 'HTTP':
                        message =
                            'The sharing service is currently unavailable. Please try again later';
                        console.warn(err);
                        break;

                    default:
                        message =
                            'Unable to connect to the sharing service. Please check your internet connection and try again.';
                        console.warn(err);
                }

                if (err.message === 'REQUEST_ABORTED' && !networkTimedOut.current) {
                    return;
                }

                setDialogPayload({
                    type: 'error',
                    title: err.message === 'TOO_BIG' ? 'Project Too Large' : 'Upload failed',
                    message: message,
                });
            }
        } finally {
            shareBusy.current = false;
            clearTimeout(timeout);
            networkTimedOut.current = false;
        }
    }

    async function handleImportProject(shareId: string) {
        if (shareBusy.current) {
            return;
        }

        shareBusy.current = true;

        const controller = new AbortController();
        networkTimedOut.current = false;

        const timeout = setTimeout(() => {
            networkTimedOut.current = true;
            controller.abort();
        }, 30000);

        try {
            const importedProject = await importProject(shareId, controller.signal);

            const result = await handleSaveAs(importedProject.name, importedProject);
            if (result) {
                const storedProject = {
                    ...importedProject,
                    id: result.id,
                    createdAt: result.createdAt,
                    updatedAt: result.updatedAt,
                };

                setIncomingProject(storedProject);

                setDialogPayload({
                    type: 'import-success',
                    name: storedProject.name,
                });
            } else {
                throw new Error("Couldn't save the imported project");
            }
        } catch (err) {
            let message =
                'Unable to connect to the sharing service. Please check your internet connection and try again.';

            if (err instanceof Error) {
                switch (err.message) {
                    case 'REQUESTED_ABORT':
                        if (networkTimedOut.current) {
                            message =
                                'The request timed out. Please check your internet connection and try again.';
                        } else {
                            message = 'Download cancelled.';
                        }
                        console.warn(err);
                        break;

                    case 'NOT_FOUND':
                        message =
                            'The shared project could not be found. Please check the share ID and try again.';
                        console.warn(err);
                        break;

                    case 'NETWORK':
                        message =
                            'Unable to connect to the sharing service. Please check your internet connection and try again.';
                        console.warn(err);
                        break;

                    case 'SERVER':
                        message =
                            'The sharing service is currently unavailable. Please try again later';
                        console.warn(err);
                        break;

                    case 'HTTP':
                        message =
                            'The sharing service is currently unavailable. Please try again later';
                        console.warn(err);
                        break;

                    default:
                        message =
                            'Unable to connect to the sharing service. Please check your internet connection and try again.';
                        console.warn(err);
                }

                if (err.message === 'REQUEST_ABORTED' && !networkTimedOut.current) {
                    return;
                }
            }
            setDialogPayload({
                type: 'error',
                title: 'Import failed',
                message: message,
            });

            return;
        } finally {
            shareBusy.current = false;
            clearTimeout(timeout);
            networkTimedOut.current = false;
        }
    }

    return {
        handleShareProject,
        handleImportProject,
    };
}
