import React from "react";
import {
    View,
    StyleSheet,
    Text,
} from "react-native";

import { File } from "expo-file-system";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import IconButton from '../IconButton';
import formatTimestamp from '../../utils/timestamp'

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
    projectCreatedAt: string,
    projectUpdatedAt: string,
    image: string,
    imageWidth: number,
    imageHeight: number,
    pickImage: () => void,
    storageReady: boolean,
    lastShare: { shareId: string, sharedAt: string }
}

export default function ProjectTab({
    projectName,
    projectCreatedAt,
    projectUpdatedAt,
    image,
    imageWidth,
    imageHeight,
    pickImage,
    storageReady,
    lastShare,
}: Props) {

    const imageFile = new File(image);

    return <View style={styles.workspaceToolBackground}>
        <View style={styles.projectTabItemRow}>
            <Text style={styles.projectTabItemLabel}>
                Project:
            </Text>
            <Text
                numberOfLines={2}
                ellipsizeMode="middle"
                style={styles.projectTabItemValue}
            >
                {projectName ? projectName : "Untitled"}
            </Text>
        </View>
        <View style={styles.projectTabItemRow}>
            <Text style={styles.projectTabItemLabel}>
                Created:
            </Text>
            <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.projectTabItemValue}
            >
                {formatTimestamp(projectCreatedAt) ?? "(Unsaved)"}
            </Text>
        </View>
        <View style={styles.projectTabItemRow}>
            <Text style={styles.projectTabItemLabel}>
                Updated:
            </Text>
            <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.projectTabItemValue}
            >
                {formatTimestamp(projectUpdatedAt) ?? "(Unsaved)"}
            </Text>
        </View>
        <View style={styles.projectTabItemRow}>
            <Text style={styles.projectTabItemLabel}>
                Image:
            </Text>
            <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.projectTabItemValue}
            >
                {image ? `[${imageWidth} x ${imageHeight}] (${formatBytes(imageFile.size)})` : 'No image'}
            </Text>
        </View>

        <View style={styles.projectTabItemRow}>
            <View style={styles.projectTabItemLabelSpacer} />
            <View
                style={styles.projectTabItemValue}
            >
                <IconButton
                    icon="image"
                    label="Change Image"
                    onPress={pickImage}
                    disabled={!storageReady}
                />
            </View>
        </View>

        {lastShare && <View style={styles.projectTabItemRow}>
            <Text style={styles.projectTabItemLabel}>
                Last share:
            </Text>
            <Text
                numberOfLines={1}
                ellipsizeMode="middle"
                style={styles.projectTabItemValue}
            >
                {lastShare.shareId}  ({(formatTimestamp(projectUpdatedAt))})
            </Text>
        </View>
        }
    </View>
}


const styles = StyleSheet.create({
    workspaceToolBackground: {
        flex: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
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
})