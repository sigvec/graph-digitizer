import React from "react";
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import IconButton from '../IconButton';
import { DatasetActionButton } from '../IconButton'
import type { Dataset } from "../../datasets/types";
import type { Point } from "../../types/geometry";

interface Props {
    activeDatasetId: string,
    setActiveDatasetId: React.Dispatch<React.SetStateAction<string>>,
    activeDataset: Dataset,
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>,
    datasets: Dataset[],
    setDirty: React.Dispatch<React.SetStateAction<boolean>>,
    toggleCurveVisibility: (id: string) => void,
    toggleDatasetVisibility: (id: string) => void,
    toggleDatasetLock: (id: string) => void,
    handleDeleteDataset: () => void,
    handleRenameDataset: () => void,
    setColourPickerVisible: React.Dispatch<React.SetStateAction<boolean>>,
    createDuplicateDataset: (daaset: Dataset) => Dataset,
    createEmptyDataset: (count: number) => Dataset,
    setSelectedPointRef: React.Dispatch<React.SetStateAction<{ datasetId: string, pointId: string } | null>>,
}

export default function DatasetsTab({
    activeDatasetId,
    setActiveDatasetId,
    activeDataset,
    setDatasets,
    datasets,
    setDirty,
    toggleCurveVisibility,
    toggleDatasetVisibility,
    toggleDatasetLock,
    handleDeleteDataset,
    handleRenameDataset,
    setColourPickerVisible,
    createDuplicateDataset,
    createEmptyDataset,
    setSelectedPointRef,
}: Props) {


    return <View style={styles.datasetTabContainer}>

        <ScrollView
            style={styles.datasetList}
            contentContainerStyle={{
                paddingVertical: 1,
            }}
        >

            {datasets.map(d => {
                const isActive = d.id === activeDatasetId;
                const rowOpacity =
                    d.visible
                        ? (d.locked ? 0.7 : 1)
                        : 0.4;

                return <TouchableOpacity
                    key={d.id}
                    onPress={() => {
                        if (!isActive) {
                            setActiveDatasetId(d.id)
                            setSelectedPointRef(null)
                        }
                    }
                    }
                    style={[
                        styles.datasetRow,
                        {
                            opacity: rowOpacity,
                        },
                        d.id === activeDatasetId &&
                        styles.activeDatasetRow,
                    ]}
                >

                    <View style={styles.datasetInfo}>
                        <View
                            style={[
                                styles.datasetColourDot,
                                {
                                    backgroundColor: d.colour,
                                },
                            ]}
                        />

                        <Text
                            style={styles.datasetName}
                        >
                            {d.name}
                        </Text>

                    </View>

                    <View style={styles.datasetOptions}>

                        <IconButton
                            icon={d.curveMode === 'none' ? 'hideCurve' : d.curveMode === 'linear' ? 'showCurveLine' : 'showCurveSpline'}
                            onPress={() => {
                                toggleCurveVisibility(d.id)
                                setDirty(true)
                            }
                            }
                        />
                        <IconButton
                            icon={d.visible ? 'visible' : 'notVisible'}
                            onPress={() => {
                                toggleDatasetVisibility(d.id)
                                setDirty(true)
                            }
                            }
                        />
                        <IconButton
                            icon={d.locked ? 'locked' : 'notLocked'}
                            onPress={() => {
                                toggleDatasetLock(d.id)
                                setDirty(true)
                            }
                            }
                        />


                    </View>
                </TouchableOpacity>

            })}
        </ScrollView>

        <View style={styles.datasetToolbar}>


            <View style={styles.toolBarButton}>
                <DatasetActionButton
                    icon="edit"
                    label="Rename"
                    onPress={handleRenameDataset}
                />
            </View>

            <View style={styles.toolBarButton}>
                <DatasetActionButton
                    icon="palette"
                    label="Colour"
                    onPress={() => setColourPickerVisible(true)}
                />
            </View>

            <View style={styles.toolBarButton}>
                <DatasetActionButton
                    icon="duplicate"
                    label="Duplicate"
                    onPress={() => {

                        const duplicateDataset = createDuplicateDataset(activeDataset);

                        setDatasets(prev => [
                            ...prev,
                            duplicateDataset,
                        ]);

                        setActiveDatasetId(
                            duplicateDataset.id
                        );

                        setSelectedPointRef(null);

                        setDirty(true)

                    }}
                />
            </View>

            <View style={styles.toolBarButton}>
                <DatasetActionButton
                    icon="delete"
                    label="Delete"
                    onPress={handleDeleteDataset}
                />
            </View>

            <View style={styles.toolBarButton}>
                <DatasetActionButton
                    icon="add"
                    label="New"
                    onPress={() => {

                        const newDataset = createEmptyDataset(datasets.length);

                        setDatasets(prev => [
                            ...prev,
                            newDataset,
                        ]);

                        setActiveDatasetId(
                            newDataset.id
                        );

                        setSelectedPointRef(null);

                        setDirty(true)

                    }}
                />
            </View>

        </View>

    </View>
}


const styles = StyleSheet.create({
    workspaceToolContainer: {
        flex: 1,
        paddingHorizontal: 8,
        backgroundColor: COLOURS.surfaceToolsContainer,
        borderBottomWidth: 1,
        borderColor: COLOURS.border,
    },

    workspaceToolBackground: {
        flex: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    axisInputs: {
        flexDirection: "row",
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },

    input: {
        //borderWidth: 1,
        borderBottomWidth: 1,
        padding: 5,
        width: 100,
        textAlign: 'right',
        backgroundColor: 'white'
    },

    calibrationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
    },

    calibrationCell: {
        flex: 1,
    },

    statusBar: {
        flexDirection: 'row',
        backgroundColor: COLOURS.surfaceAlt,
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLOURS.border,
    },

    pointControls: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 4,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.lg,
        borderRadius: 10,
    },


    workspaceToolbarContainer: {
        flex: 1,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    separator: {
        width: 1,
        alignSelf: 'stretch',
        backgroundColor: '#b2b2b2',
        marginHorizontal: 12,
        marginVertical: 8,
    },

    statusText: {
        flexShrink: 1,
        ...TYPOGRAPHY.small,
        color: COLOURS.muted,
    },

    datasetTabContainer: {
        flex: 1,
    },

    datasetList: {
        flex: 1,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    datasetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 1,
        minHeight: 32,
        borderWidth: 1,
        borderColor: 'transparent',
    },

    activeDatasetRow: {
        borderWidth: 1,
        borderColor: '#666',
        borderRadius: 8,
    },

    datasetInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 2,
    },

    datasetColourDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },

    datasetName: {
        flexShrink: 1,
        fontSize: 16,
    },

    datasetOptions: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    datasetToolbar: {
        flexDirection: 'row',
        gap: 2,
    },

    toolBarButton: {
        flex: 1,
    },
})