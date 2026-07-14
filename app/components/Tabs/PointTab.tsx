import React from "react";
import {
    View,
    StyleSheet,
    Text,
    Switch,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import IconButton from '../IconButton';
import type { Dataset } from "../../datasets/types";
import type { Point } from "../../types/geometry";

interface Props {
    activeDatasetId: string,
    activeDataset: Dataset,
    setDatasets: React.Dispatch<React.SetStateAction<Dataset[]>>,
    selectedPointRef: { datasetId: string, pointId: string },
    setSelectedPointRef: React.Dispatch<React.SetStateAction<{ datasetId: string, pointId: string }>>,
    selectedPointIndex: number,
    selectedPointData: Point,
    pointCount: number,

    nudgePoint: (dx: number, dy: number) => void,
    nudgeAllPoints: boolean,
    setNudgeAllPoints: React.Dispatch<React.SetStateAction<boolean>>,

    handleDeletePoint: () => void,

    zoomDisplay: number,
}

export default function PointTab({
    activeDatasetId,
    activeDataset,
    setDatasets,
    selectedPointRef,
    setSelectedPointRef,
    selectedPointIndex,
    selectedPointData,
    pointCount,

    nudgePoint,
    nudgeAllPoints,
    setNudgeAllPoints,

    handleDeletePoint,

    zoomDisplay,
}: Props) {


    return <View style={[
        styles.workspaceToolBackground,
        {
            paddingVertical: 0,
            justifyContent: 'space-between',
        }
    ]}>


        <View
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 2
                },
            ]}
        >
            <View
                style={[
                    {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        marginRight: 8,
                        backgroundColor: activeDataset.colour,
                    },
                ]}
            />
            <IconButton
                icon="previous"
                onPress={() => {
                    if (!selectedPointRef) {
                        return;
                    }
                    const prevIndex = (selectedPointIndex - 1 + activeDataset.points.length) % activeDataset.points.length;
                    setSelectedPointRef({
                        datasetId: activeDataset.id,
                        pointId: activeDataset.points[prevIndex].id || '',
                    })
                }}
                disabled={!selectedPointRef}
            />
            {selectedPointData ? (
                < Text style={[
                    {
                        ...TYPOGRAPHY.body,
                        color: COLOURS.text,
                        paddingHorizontal: 5
                    },
                ]
                }>
                    Point {selectedPointIndex + 1} / {pointCount}
                </Text>
            ) : (
                <Text style={styles.statusText}>
                    (No selection)
                </Text>
            )}
            <IconButton
                icon="next"
                onPress={() => {
                    if (!selectedPointRef) {
                        return;
                    }
                    const nextIndex = (selectedPointIndex + 1) % activeDataset.points.length;
                    setSelectedPointRef({
                        datasetId: activeDataset.id,
                        pointId: activeDataset.points[nextIndex].id,
                    })
                }}
                disabled={!selectedPointRef}
            />
            <View
                style={[
                    {
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        marginRight: 8,
                    },
                ]}
            />
        </View>

        <View style={styles.pointControls}>
            <Text
                style={[
                    {
                        flex: 1,
                        alignItems: 'center',
                        paddingTop: 2
                    },
                ]}>
                Nudge:
            </Text>
            <IconButton
                icon="nudgeLeft"
                onPress={() => nudgePoint(-1 / zoomDisplay, 0)}
                disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
            />
            <View>
                <IconButton
                    icon="nudgeUp"
                    onPress={() => nudgePoint(0, -1 / zoomDisplay)}
                    disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                />
                <IconButton
                    icon="nudgeDown"
                    onPress={() => nudgePoint(0, 1 / zoomDisplay)}
                    disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
                />

            </View>
            <IconButton
                icon="nudgeRight"
                onPress={() => nudgePoint(1 / zoomDisplay, 0)}
                disabled={(!selectedPointRef && !nudgeAllPoints) || activeDataset.locked}
            />
            <View
                style={[
                    {
                        flex: 1,
                        alignItems: 'center',
                    },
                ]}
            >
                <Switch
                    value={nudgeAllPoints}
                    onValueChange={setNudgeAllPoints}
                />
                <Text>All points</Text>
            </View>



        </View>

        <View style={[
            {
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                marginTop: 8,
                alignItems: 'center',
                justifyContent: 'center'
            }
        ]
        }>
            <View style={[
                {
                    flex: 1,
                }
            ]
            }>
                <IconButton
                    icon="delete"
                    label="Delete Point"
                    onPress={selectedPointRef && handleDeletePoint}
                    disabled={!selectedPointRef || activeDataset.locked}
                />
            </View>

            <View style={[
                {
                    flex: 1,
                }
            ]
            }>
                <IconButton
                    icon="clearAll"
                    label="Clear All"
                    onPress={() => {
                        setDatasets(prev =>
                            prev.map(d =>
                                d.id === activeDatasetId
                                    ? { ...d, points: [] }
                                    : d
                            )
                        );
                    }}
                    disabled={activeDataset.locked}
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
})