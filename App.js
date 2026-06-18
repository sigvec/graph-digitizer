import { useState } from 'react';
import { Modal, Alert } from 'react-native';
import MainScreen from './app/screens/MainScreen';
import ProjectListScreen from './app/screens/ProjectListScreen';
import storage from './frontend/services/storage';

export default function App() {
    const [showProjectList, setShowProjectList] = useState(false);
    const [loadedProject, setLoadedProject] = useState(null);
    const [dirty, setDirty] = useState(false);

    async function handleSelect(id) {

        if (dirty) {

            Alert.alert(
                'Unsaved Changes',
                'Discard current project changes?',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => handleLoadProject(id)
                    },
                ]
            );

            return;
        }

        handleLoadProject(id)
    }

    async function handleLoadProject(id) {
        try {
            const project = await storage.loadProject(id);

            setLoadedProject(project);
            setShowProjectList(false);
        } catch (err) {
            console.error(err);
        }
    }

    function handleOpenList() {
        setShowProjectList(true);
    }

    function handleBack() {
        setShowProjectList(false);
    }


    return (
        <>
            <MainScreen
                onOpenList={handleOpenList}
                loadedProject={loadedProject}
                setLoadedProject={setLoadedProject}
                dirty={dirty}
                setDirty={setDirty}
            />
            <Modal
                visible={showProjectList}
                animationType="slide"
            >
                <ProjectListScreen
                    onSelect={handleSelect}
                    onBack={handleBack}
                />
            </Modal>
        </>
    );
}