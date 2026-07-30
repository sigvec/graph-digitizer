import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import storage from '../../frontend/services/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import formatTimestamp from '../utils/timestamp';

import IconButton from '../components/IconButton';

import { StoredProject } from '../../frontend/services/sharing/Project';

interface ProjectListScreenProps {
    onSelect: (id: string) => void;
    onBack: () => void;
    currentId: string | null;
}

export default function ProjectListScreen({ onSelect, onBack, currentId }: ProjectListScreenProps) {
    const [projects, setProjects] = useState<StoredProject[]>([]);

    async function loadProjects() {
        try {
            const data = await storage.loadAllProjects();
            setProjects(data);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        loadProjects();
    }, []);

    async function handleDelete(id: string) {
        try {
            await storage.deleteProject(id);

            setProjects((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error(err);
        }
    }

    function confirmDelete(id: string) {
        Alert.alert('Delete Project', 'This cannot be undone.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDelete(id),
            },
        ]);
    }

    if (projects.length === 0) {
        return (
            <View style={{ padding: 20 }}>
                <IconButton label="Back" onPress={onBack} />

                <Text
                    style={{
                        marginTop: 20,
                        fontSize: 16,
                    }}
                >
                    No saved projects yet.
                </Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={{ flex: 1 }}>
                <FlatList
                    data={projects}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        return (
                            <View
                                style={{
                                    padding: 12,
                                    borderBottomWidth: 1,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <TouchableOpacity
                                    style={{ flex: 1 }}
                                    onPress={() => onSelect(item.id)}
                                >
                                    <Text style={{ fontWeight: 'bold' }}>
                                        {item.name || 'Untitled'}
                                    </Text>

                                    <Text>Datasets: {item.datasetCount}</Text>
                                    <Text>Created: {formatTimestamp(item.createdAt)}</Text>
                                    <Text>Updated: {formatTimestamp(item.updatedAt)}</Text>
                                </TouchableOpacity>

                                {item.id !== currentId && (
                                    <IconButton
                                        icon="delete"
                                        label="Delete"
                                        onPress={() => confirmDelete(item.id)}
                                    />
                                )}

                                {item.id === currentId && <Text>(Currently project)</Text>}
                            </View>
                        );
                    }}
                />

                <IconButton label="Back" onPress={onBack} selected={true} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});
