import { useState } from 'react';
import { Modal, Alert } from 'react-native';

import MainScreen from './app/screens/MainScreen';
import ProjectListScreen from './app/screens/ProjectListScreen';
import storage from './frontend/services/storage';
import type { StoredProject } from './frontend/services/sharing/Project';

export default function App() {
    const [isProjectListVisible, setIsProjectListVisible] = useState(false);
    const [incomingProject, setIncomingProject] = useState<StoredProject | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    const loadProjectById = async (id: string) => {
        try {
            const project = await storage.loadProject(id);
            setIncomingProject(project);
            setIsProjectListVisible(false);
        } catch (err) {
            console.error('App failed to load project:', err);
            Alert.alert('Error', 'Failed to load the selected project.');
        }
    };

    const handleSelectProject = (id: string) => {
        if (isDirty) {
            Alert.alert('Unsaved Changes', 'Discard current project changes?', [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                        void loadProjectById(id);
                    },
                },
            ]);

            return;
        }

        void loadProjectById(id);
    };

    return (
        <>
            <MainScreen
                currentProjectId={currentProjectId}
                setCurrentProjectId={setCurrentProjectId}
                onOpenList={() => setIsProjectListVisible(true)}
                incomingProject={incomingProject}
                setIncomingProject={setIncomingProject}
                isDirty={isDirty}
                onDirtyChanged={setIsDirty}
            />
            <Modal visible={isProjectListVisible} animationType="slide">
                <ProjectListScreen
                    onSelect={handleSelectProject}
                    onBack={() => setIsProjectListVisible(false)}
                    currentId={currentProjectId}
                />
            </Modal>
        </>
    );
}
