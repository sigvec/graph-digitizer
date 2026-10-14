import React from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';

import { File } from 'expo-file-system';

import { COLOURS, SPACING } from '../../theme';
import IconButton from '../IconButton';
import formatTimestamp from '../../utils/timestamp';
import { ImageSize } from '../../image/useImageManager';
import * as Clipboard from 'expo-clipboard';
import { Dataset } from '../../datasets/types';
import { Calibration } from '../../calibration/types';
import { generateSimpleCSV } from '../../export/csv';

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
    projectName: string;
    projectCreatedAt: string | null;
    projectUpdatedAt: string | null;
    image: string;
    imageSize: ImageSize | null;
    pickImage: () => void;
    storageReady: boolean;
    lastShare: { shareId: string; sharedAt: string } | undefined;
    datasets: Dataset[];
    activeDataset: Dataset | null;
    calibration: Calibration;
    calibratedState: boolean;
}

export default function ProjectTab({
    projectName,
    projectCreatedAt,
    projectUpdatedAt,
    image,
    imageSize,
    pickImage,
    storageReady,
    lastShare,
    datasets,
    activeDataset,
    calibration,
    calibratedState,
}: Props) {
    const imageFile = new File(image);
    const imageWidth = imageSize?.width;
    const imageHeight = imageSize?.height;

    return (
        <ScrollView
            style={styles.projectScrollView}
            contentContainerStyle={styles.projectScrollContent}
        >
            <View style={styles.workspaceToolBackground}>
                <View style={styles.projectTabItemRow}>
                    <Text style={styles.projectTabItemLabel}>Project:</Text>
                    <Text
                        numberOfLines={2}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                    >
                        {projectName ? projectName : 'Untitled'}
                    </Text>
                </View>
                <View style={styles.projectTabItemRow}>
                    <Text style={styles.projectTabItemLabel}>Created:</Text>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                    >
                        {projectCreatedAt != null ? formatTimestamp(projectCreatedAt) : '(Unsaved)'}
                    </Text>
                </View>
                <View style={styles.projectTabItemRow}>
                    <Text style={styles.projectTabItemLabel}>Updated:</Text>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                    >
                        {projectUpdatedAt != null ? formatTimestamp(projectUpdatedAt) : '(Unsaved)'}
                    </Text>
                </View>
                <View style={styles.projectTabItemRow}>
                    <Text style={styles.projectTabItemLabel}>Image:</Text>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        style={styles.projectTabItemValue}
                    >
                        {image && imageWidth && imageHeight
                            ? `[${imageWidth} x ${imageHeight}] (${formatBytes(imageFile.size)})`
                            : 'No image'}
                    </Text>
                </View>

                <View style={styles.projectTabItemRow}>
                    <View style={styles.projectTabItemLabelSpacer} />
                    <View style={styles.projectTabItemValue}>
                        <IconButton
                            icon="image"
                            label="Change Image"
                            onPress={pickImage}
                            disabled={!storageReady}
                        />
                    </View>
                </View>

                {lastShare && (
                    <View style={styles.projectTabItemRow}>
                        <Text style={styles.projectTabItemLabel}>Last share:</Text>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode="middle"
                            style={styles.projectTabItemValue}
                        >
                            {lastShare.shareId} ({formatTimestamp(lastShare.sharedAt)})
                        </Text>
                    </View>
                )}

                <View style={styles.exportControls}>
                    <View style={styles.exportButton}>
                        <IconButton
                            label="Export selected to CSV"
                            onPress={async () => {
                                if (!calibratedState) {
                                    alert('Not calibrated');
                                    return;
                                }
                                if (!activeDataset) {
                                    alert('No selected dataset');
                                    return;
                                }
                                await Clipboard.setStringAsync(
                                    generateSimpleCSV([activeDataset], calibration),
                                );
                                alert('Copied!');
                            }}
                        />
                    </View>
                    <View style={styles.exportButton}>
                        <IconButton
                            label="Export all to CSV"
                            onPress={async () => {
                                if (!calibratedState) {
                                    alert('Calibration incomplete');
                                    return;
                                }
                                await Clipboard.setStringAsync(
                                    generateSimpleCSV(datasets, calibration),
                                );
                                alert('Copied!');
                            }}
                        />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    projectScrollView: {
        flex: 1,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    projectScrollContent: {
        flexGrow: 1,
    },

    workspaceToolBackground: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    exportControls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: SPACING.md,
    },

    exportButton: {
        flex: 1,
        minWidth: 160,
    },

    projectTabItemRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },

    projectTabItemLabel: {
        width: 80,
        fontWeight: 'bold',
    },

    projectTabItemValue: {
        flex: 1,
    },

    projectTabItemLabelSpacer: {
        width: 80,
    },
});
