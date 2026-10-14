import React from 'react';
import * as Clipboard from 'expo-clipboard';
import { View, StyleSheet, Text, TextStyle, ScrollView, Switch } from 'react-native';

import { Calibration } from '../../calibration/types';
import { Dataset, DatasetStatistics } from '../../datasets/types';
import { LinearRegressionResult } from '../../analysis/types';

import { COLOURS, SPACING, TYPOGRAPHY } from '../../theme';
import AppIcon from '../AppIcon';
import IconButton from '../IconButton';
import { formatRegressionEquation } from '../../analysis/equationFormatter';
import { AxisScale } from '../../calibration/constants';

function getRegressionModelType(calibration: Calibration): string {
    if (calibration.x.scaleType === AxisScale.LINEAR) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return 'Linear';
        } else {
            return 'Exponential';
        }
    }

    if (calibration.x.scaleType === AxisScale.LOG) {
        if (calibration.y.scaleType === AxisScale.LINEAR) {
            return 'Logarithmic';
        } else {
            return 'Power law';
        }
    }

    return '';
}

interface Props {
    datasets: Dataset[];
    activeDataset: Dataset | null;
    stats: DatasetStatistics | null;
    linearFit: LinearRegressionResult | null;
    linearR2: number | null;
    calibration: Calibration;
    calibratedState: boolean;
    showRegressionLine: boolean;
    setShowRegressionLine: React.Dispatch<React.SetStateAction<boolean>>;
    onDirtyChanged: (newValue: boolean) => void;
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
    onDirtyChanged,
}: Props) {
    const modelType = getRegressionModelType(calibration);

    return (
        <ScrollView style={styles.workspaceToolbarContainer}>
            <View style={styles.workspaceToolBackground}>
                <View style={{ flex: 1 }}>
                    <View style={styles.datasetInfo}>
                        <Text
                            style={[
                                {
                                    marginRight: 15,
                                },
                            ]}
                        >
                            Selected:
                        </Text>
                        <View
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
                            }}
                        >
                            {activeDataset?.name ?? 'None'}
                        </Text>
                    </View>
                    {stats && <Text>Points: {stats.count}</Text>}

                    {stats && (
                        <Text>
                            X range: {stats.minX.toFixed(2)} to {stats.maxX.toFixed(2)}
                        </Text>
                    )}
                    {stats && (
                        <Text>
                            Y range: {stats.minY.toFixed(2)} to {stats.maxY.toFixed(2)}
                        </Text>
                    )}

                    {!calibratedState && (
                        <View style={[styles.statusBarIndicator]}>
                            <AppIcon name={'alert'} size={14} colour={'#d65910'} />
                            <Text style={{ color: '#d65910' }}>(Calibration not set)</Text>
                        </View>
                    )}

                    {linearFit && (
                        <View
                            style={{
                                flexDirection: 'column',
                                marginTop: 6,
                                justifyContent: 'space-between',
                            }}
                        >
                            <Text>
                                Best-fit equation — {modelType}
                                {linearR2 != null ? `  (R² = ${linearR2.toFixed(4)})` : ''}:
                            </Text>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                }}
                            >
                                <View
                                    style={{
                                        flex: 1,
                                        flexDirection: 'row',
                                        borderColor: '#c0c0c0',
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        padding: 12,
                                        justifyContent: 'space-evenly',
                                        gap: 3,
                                    }}
                                >
                                    <Text>{formatRegressionEquation(linearFit, calibration)}</Text>
                                </View>

                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text>Show</Text>
                                    <Switch
                                        value={showRegressionLine}
                                        onValueChange={() => {
                                            setShowRegressionLine((prev) => !prev);
                                            onDirtyChanged(true);
                                        }}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {linearFit && activeDataset && (
                        <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
                            <IconButton
                                label="Export regression results"
                                onPress={async () => {
                                    const report = [
                                        'Graph Digitizer — Regression Results',
                                        '',
                                        `Dataset: ${activeDataset.name}`,
                                        `Model: ${modelType} regression`,
                                        `X axis scale: ${calibration.x.scaleType}`,
                                        `Y axis scale: ${calibration.y.scaleType}`,
                                        '',
                                        'Equation:',
                                        formatRegressionEquation(linearFit, calibration),
                                        '',
                                        'Regression parameters:',
                                        `Slope: ${linearFit.slope}`,
                                        `Intercept: ${linearFit.intercept}`,
                                        `R²: ${linearR2 == null ? 'Not available' : linearR2}`,
                                        `Number of data points: ${activeDataset.points.length}`,
                                        ...(calibration.x.scaleType !== 'linear' ||
                                        calibration.y.scaleType !== 'linear'
                                            ? [
                                                  '',
                                                  'Note: Regression uses logarithmically transformed coordinates.',
                                              ]
                                            : []),
                                    ].join('\n');
                                    await Clipboard.setStringAsync(report);
                                    alert('Regression results copied!');
                                }}
                            />
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
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
});
