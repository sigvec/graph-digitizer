import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import storage from '../../frontend/services/storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import formatTimestamp from '../utils/timestamp';

import IconButton from '../components/IconButton';

export default function ProjectListScreen({
  onSelect,
  onBack,
}) {
  const [projects, setProjects] = useState([]);

  async function loadProjects() {
    try {
      const data = await storage.listProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleDelete(id) {
    try {
      await storage.deleteProject(id);

      setProjects(prev =>
        prev.filter(p => p.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  }

  function confirmDelete(id) {
    Alert.alert(
      'Delete Project',
      'This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(id),
        },
      ]
    );
  }

  if (projects.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <IconButton
          label="Back"
          onPress={onBack}
        />

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

    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <View style={{ flex: 1 }}>


        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {

            const timestamp =
              item.updatedAt ??
              item.createdAt;

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

                  <Text>
                    Datasets: {item.datasetCount}
                  </Text>
                  <Text>
                    Created: {formatTimestamp(item.createdAt)}
                  </Text>
                  <Text>
                    Updated: {formatTimestamp(item.updatedAt)}
                  </Text>
                </TouchableOpacity>

                <IconButton
                  icon="delete"
                  label="Delete"
                  onPress={() => confirmDelete(item.id)}
                />

              </View>
            )
          }
          }
        />

        <IconButton
          label="Back"
          onPress={onBack}
          selected={true}
        />

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