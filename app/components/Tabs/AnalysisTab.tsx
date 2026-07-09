import React from "react";
import {
    View,
    StyleSheet,
    Text,
    TextStyle,
    ScrollView,
    Switch,
} from "react-native";

import * as Clipboard from "expo-clipboard";

import { Calibration } from '../../calibration/types'
import { Dataset, DatasetStatistics } from '../../datasets/types'
import { LinearRegressionResult } from '../../analysis/types'

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import AppIcon from '../AppIcon';
import IconButton from '../IconButton';
import { formatRegressionEquation } from '../../analysis/equationFormatter'
import { generateSimpleCSV } from '../../export/csv'
import { AxisScale } from "../../calibration/constants";

interface Props {
    datasets: Dataset[];
    activeDataset: Dataset | null;
    stats: DatasetStatistics;
    linearFit: LinearRegressionResult;
    linearR2: number;
    calibration: Calibration;
    calibratedState: boolean;
    showRegressionLine: boolean;
    setShowRegressionLine: React.Dispatch<React.SetStateAction<boolean>>;
    setDirty: React.Dispatch<React.SetStateAction<boolean>>;
}

function getRegressionModelType(calibration: Calibration): string {
    if (calibration.x.scaleType === AxisScale.LINEAR) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return "Linear";
        } else {
            return "Exponential";
        }
    }

    if (calibration.x.scaleType === AxisScale.LOG) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return "Logarithmic";
        } else {
            return "Power law";
        }
    }

    return ""
}

export default function AnalysisTab({
    datasets,
    activeDataset,
    stats,
    linearFit,
    linearR2,
    calibration,
    calibratedState,
    showRegressionLine,
    setShowRegressionLine,
    setDirty
}: Props) {

    const modelType = getRegressionModelType(calibration);

    return <ScrollView
        style={styles.workspaceToolbarContainer}
    >
        <View style={styles.workspaceToolBackground}>
            <View style={{ flex: 1 }}>

                <View style={styles.datasetInfo}>
                    <Text style={
                        [
                            {
                                marginRight: 15
                            },
                        ]
                    }>
                        Selected:
                    </Text>
                    < View
                        style={[
                            {
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                marginRight: 8,
                                backgroundColor: activeDataset?.colour,
                            },
                        ]}
                    />
                    <Text
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        style={{
                            ...(TYPOGRAPHY.title as TextStyle),
                            color: COLOURS.text,
                            flexShrink: 1,
                        }} >
                        {activeDataset?.name ?? "None"}
                    </Text>

                </View>
                {
                    stats && (
                        <Text>
                            Points: {stats.count}
                        </Text>
                    )
                }

                {
                    stats && (
                        <Text>
                            X range: {stats.minX.toFixed(2)} to {stats.maxX.toFixed(2)}
                        </Text>
                    )
                }
                {
                    stats && (
                        <Text>
                            Y range: {stats.minY.toFixed(2)} to {stats.maxY.toFixed(2)}
                        </Text>
                    )
                }


                {
                    (!calibratedState) && (
                        <View style={
                            [
                                styles.statusBarIndicator,
                            ]
                        }>
                            <AppIcon
                                name={"alert"}
                                size={14}
                                colour={'#d65910'}
                            />
                            <Text style={{ color: '#d65910' }}>
                                (Calibration not set)
                            </Text>
                        </View>
                    )
                }

                {
                    linearFit && (
                        <View style={
                            {
                                flexDirection: 'column',
                                marginTop: 6,
                                justifyContent: 'space-between',
                            }

                        }>
                            <Text>Best-fit equation — {modelType}{linearR2 != null ? `  (R² = ${linearR2.toFixed(4)})` : ""}:</Text>
                            <View style={
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }
                            }>
                                <View style={
                                    {
                                        flex: 1,
                                        flexDirection: 'row',
                                        borderColor: '#c0c0c0',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        padding: 12,
                                        justifyContent: 'space-evenly',
                                        gap: 3,
                                    }

                                }>
                                    <Text>{formatRegressionEquation(linearFit, calibration)}</Text>
                                </View>

                                <View style={
                                    {
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }
                                }>
                                    <Text>Show</Text>
                                    <Switch
                                        value={showRegressionLine}
                                        onValueChange={() => {
                                            setShowRegressionLine(prev => !prev)
                                            setDirty(true)
                                        }
                                        }
                                    />
                                </View>
                            </View>


                        </View>
                    )
                }
            </View>


            < View style={styles.controls} >
                <View style={{ flex: 1 }}>
                    <IconButton
                        label="Export selected to CSV"
                        onPress={async () => {
                            if (!calibratedState) {
                                alert("Not calibrated");
                                return;
                            }
                            if (!activeDataset) {
                                alert("No selected dataset");
                                return;
                            }
                            const csv = generateSimpleCSV([activeDataset], calibration);
                            await Clipboard.setStringAsync(csv);
                            alert("Copied!");
                        }}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    < IconButton
                        label="Export all to CSV"
                        onPress={async () => {
                            if (!calibratedState) {
                                alert("Calibration incomplete");
                                return;
                            }
                            const csv = generateSimpleCSV(datasets, calibration);
                            await Clipboard.setStringAsync(csv);
                            alert("Copied!");
                        }}
                    />
                </View>
            </View>
        </View>
    </ScrollView>

}



const styles = StyleSheet.create({
    workspaceToolbarContainer: {
        flex: 1,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    workspaceToolBackground: {
        flex: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
    },

    datasetInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 2,
    },

    statusBarIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },

    controls: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
})