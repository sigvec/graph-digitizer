import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Switch, Pressable } from 'react-native';

import { COLOURS, SPACING } from '../../theme';
import AppIcon from '../AppIcon';
import IconButton from '../IconButton';
import { AxisScale } from '../../calibration/constants';
import { TextInputModal } from '../Modals';
import {
    Calibration,
    CalibrationAxis,
    CalibrationSelection,
    NumericCalibrationKey,
} from '../../calibration/types';

interface Props {
    updateCalibrationValue: (
        axis: CalibrationAxis,
        key: NumericCalibrationKey,
        value: number,
    ) => boolean;
    calibration: Calibration;
    setCalibration: React.Dispatch<React.SetStateAction<Calibration>>;
    calibrationSelection: CalibrationSelection;
    setCalibrationSelection: React.Dispatch<React.SetStateAction<CalibrationSelection>>;
    calibratedState: boolean;
    setCalibratedState: React.Dispatch<React.SetStateAction<boolean>>;
    onDirtyChanged: (newValue: boolean) => void;
    nudgeCalibrationPoint: (selection: CalibrationSelection, dx: number, dy: number) => void;
    zoomDisplay: number;
}

export default function CalibrationTab({
    updateCalibrationValue,
    calibration,
    setCalibration,
    calibrationSelection,
    setCalibrationSelection,
    calibratedState,
    setCalibratedState,
    onDirtyChanged,
    nudgeCalibrationPoint,
    zoomDisplay,
}: Props) {
    const [x0Text, setX0Text] = useState(String(calibration.x.value0));
    const [x1Text, setX1Text] = useState(String(calibration.x.value1));
    const [y0Text, setY0Text] = useState(String(calibration.y.value0));
    const [y1Text, setY1Text] = useState(String(calibration.y.value1));

    const [changeValueX0Visible, setChangeValueX0Visible] = useState(false);
    const [changeValueX1Visible, setChangeValueX1Visible] = useState(false);
    const [changeValueY0Visible, setChangeValueY0Visible] = useState(false);
    const [changeValueY1Visible, setChangeValueY1Visible] = useState(false);

    useEffect(() => {
        setX0Text(String(calibration.x.value0));
        setX1Text(String(calibration.x.value1));
        setY0Text(String(calibration.y.value0));
        setY1Text(String(calibration.y.value1));
    }, [calibration.x.value0, calibration.x.value1, calibration.y.value0, calibration.y.value1]);

    return (
        <>
            <ScrollView style={styles.workspaceToolbarContainer}>
                <View style={styles.workspaceToolBackground}>
                    <View
                        style={[
                            styles.axisInputs,
                            {
                                backgroundColor: '#f5f5f5',
                                padding: 10,
                                borderRadius: 10,
                                marginBottom: 10,
                                borderWidth: 1,
                                borderColor: '#e5e5e5',
                            },
                        ]}
                    >
                        <Text>X axis</Text>

                        <View style={{ flex: 1 }}>
                            <View style={[styles.axisInputs, { margin: 5 }]}>
                                <Text>X0:</Text>
                                <Pressable onPress={() => setChangeValueX0Visible(true)}>
                                    <Text style={styles.input}>{x0Text}</Text>
                                </Pressable>
                                <Text>X1:</Text>
                                <Pressable onPress={() => setChangeValueX1Visible(true)}>
                                    <Text style={styles.input}>{x1Text}</Text>
                                </Pressable>
                            </View>

                            <View style={styles.axisInputs}>
                                <View
                                    style={[
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#efefef',
                                            borderRadius: 10,
                                            paddingHorizontal: 8,
                                        },
                                    ]}
                                >
                                    <Text>Use origin as X0</Text>
                                    <Switch
                                        value={calibration.x.p0 === null}
                                        onValueChange={() => {
                                            const prevCalibrationPoint = calibration.x;
                                            let newCalibrationPoint;

                                            if (calibration.x.p0 === null) {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    p0:
                                                        (calibration.origin.x + calibration.x.p1) /
                                                        2,
                                                };
                                            } else {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    p0: null,
                                                };
                                                if (calibrationSelection === 'x0') {
                                                    setCalibrationSelection('origin');
                                                }
                                            }
                                            setCalibration((prev) => ({
                                                ...prev,
                                                x: newCalibrationPoint,
                                            }));
                                            setCalibratedState(true);
                                            onDirtyChanged(true);
                                        }}
                                    />
                                    <View style={styles.separator} />
                                    <Text>Log</Text>
                                    <Switch
                                        value={calibration.x.scaleType === AxisScale.LOG}
                                        onValueChange={() => {
                                            const prevCalibrationPoint = calibration.x;
                                            let newCalibrationPoint;

                                            if (calibration.x.scaleType === AxisScale.LOG) {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    scaleType: AxisScale.LINEAR,
                                                };
                                            } else {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    scaleType: AxisScale.LOG,
                                                };
                                            }
                                            setCalibration((prev) => ({
                                                ...prev,
                                                x: newCalibrationPoint,
                                            }));
                                            setCalibratedState(true);
                                            onDirtyChanged(true);
                                        }}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                    <View
                        style={[
                            styles.axisInputs,
                            {
                                backgroundColor: '#f5f5f5',
                                padding: 10,
                                borderRadius: 10,
                                marginBottom: 10,
                                borderWidth: 1,
                                borderColor: '#e5e5e5',
                            },
                        ]}
                    >
                        <Text>Y axis</Text>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.axisInputs, { margin: 5 }]}>
                                <Text>Y0:</Text>
                                <Pressable onPress={() => setChangeValueY0Visible(true)}>
                                    <Text style={styles.input}>{y0Text}</Text>
                                </Pressable>
                                <Text>Y1:</Text>
                                <Pressable onPress={() => setChangeValueY1Visible(true)}>
                                    <Text style={styles.input}>{y1Text}</Text>
                                </Pressable>
                            </View>
                            <View style={styles.axisInputs}>
                                <View
                                    style={[
                                        {
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: '#efefef',
                                            borderRadius: 10,
                                            paddingHorizontal: 8,
                                        },
                                    ]}
                                >
                                    <Text>Use origin as Y0</Text>
                                    <Switch
                                        value={calibration.y.p0 === null}
                                        onValueChange={() => {
                                            const prevCalibrationPoint = calibration.y;
                                            let newCalibrationPoint;

                                            if (calibration.y.p0 === null) {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    p0:
                                                        (calibration.origin.y + calibration.y.p1) /
                                                        2,
                                                };
                                            } else {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    p0: null,
                                                };
                                                if (calibrationSelection === 'y0') {
                                                    setCalibrationSelection('origin');
                                                }
                                            }
                                            setCalibration((prev) => ({
                                                ...prev,
                                                y: newCalibrationPoint,
                                            }));
                                            setCalibratedState(true);
                                            onDirtyChanged(true);
                                        }}
                                    />
                                    <View style={styles.separator} />
                                    <Text>Log</Text>
                                    <Switch
                                        value={calibration.y.scaleType === AxisScale.LOG}
                                        onValueChange={() => {
                                            const prevCalibrationPoint = calibration.y;
                                            let newCalibrationPoint;

                                            if (calibration.y.scaleType === AxisScale.LOG) {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    scaleType: AxisScale.LINEAR,
                                                };
                                            } else {
                                                newCalibrationPoint = {
                                                    ...prevCalibrationPoint,
                                                    scaleType: AxisScale.LOG,
                                                };
                                            }
                                            setCalibration((prev) => ({
                                                ...prev,
                                                y: newCalibrationPoint,
                                            }));
                                            setCalibratedState(true);
                                            onDirtyChanged(true);
                                        }}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    <Text>Nudge:</Text>
                    <View style={styles.calibrationRow}>
                        <View
                            style={[
                                styles.calibrationCell,
                                {
                                    flex: 1.5,
                                    marginRight: 4,
                                },
                            ]}
                        >
                            <IconButton
                                label="[Origin]"
                                onPress={() => setCalibrationSelection('origin')}
                                selected={calibrationSelection === 'origin'}
                            />
                            {!calibratedState && (
                                <View style={{ justifyContent: 'center' }}>
                                    <AppIcon name={'alert'} size={14} colour={'#d65910'} />
                                    <Text style={{ color: '#d65910' }}>(Default)</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.calibrationCell]}>
                                <IconButton
                                    label="[X0]"
                                    onPress={() => {
                                        if (calibration.x.p0 !== null) {
                                            setCalibrationSelection('x0');
                                        }
                                    }}
                                    selected={calibrationSelection === 'x0'}
                                    disabled={calibration.x.p0 === null}
                                />
                                <IconButton
                                    label="[Y0]"
                                    onPress={() => {
                                        if (calibration.y.p0 !== null) {
                                            setCalibrationSelection('y0');
                                        }
                                    }}
                                    selected={calibrationSelection === 'y0'}
                                    disabled={calibration.y.p0 === null}
                                />
                            </View>
                            <View style={[styles.calibrationCell]}></View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[styles.calibrationCell]}>
                                <IconButton
                                    label="[X1]"
                                    onPress={() => setCalibrationSelection('x1')}
                                    selected={calibrationSelection === 'x1'}
                                />
                            </View>
                            <View style={[styles.calibrationCell]}>
                                <IconButton
                                    label="[Y1]"
                                    onPress={() => setCalibrationSelection('y1')}
                                    selected={calibrationSelection === 'y1'}
                                />
                            </View>
                        </View>

                        <View style={styles.pointControls}>
                            <IconButton
                                icon="nudgeLeft"
                                onPress={() =>
                                    nudgeCalibrationPoint(calibrationSelection, -1 / zoomDisplay, 0)
                                }
                                disabled={calibrationSelection[0] === 'y'}
                            />
                            <View>
                                <IconButton
                                    icon="nudgeUp"
                                    onPress={() =>
                                        nudgeCalibrationPoint(
                                            calibrationSelection,
                                            0,
                                            -1 / zoomDisplay,
                                        )
                                    }
                                    disabled={calibrationSelection[0] === 'x'}
                                />
                                <IconButton
                                    icon="nudgeDown"
                                    onPress={() =>
                                        nudgeCalibrationPoint(
                                            calibrationSelection,
                                            0,
                                            1 / zoomDisplay,
                                        )
                                    }
                                    disabled={calibrationSelection[0] === 'x'}
                                />
                            </View>
                            <IconButton
                                icon="nudgeRight"
                                onPress={() =>
                                    nudgeCalibrationPoint(calibrationSelection, 1 / zoomDisplay, 0)
                                }
                                disabled={calibrationSelection[0] === 'y'}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>

            <TextInputModal
                visible={changeValueX0Visible}
                title="Enter new value for X0"
                initialValue={x0Text}
                confirmLabel="Apply"
                onConfirm={(newValue: string) => {
                    const value = parseFloat(newValue);
                    if (updateCalibrationValue('x', 'value0', value)) {
                        setX0Text(String(value));
                    } else {
                        setX0Text(String(calibration.x.value0));
                    }
                    setCalibratedState(true);
                    onDirtyChanged(true);
                    setChangeValueX0Visible(false);
                }}
                onCancel={() => setChangeValueX0Visible(false)}
            />

            <TextInputModal
                visible={changeValueX1Visible}
                title="Enter new value for X1"
                initialValue={x1Text}
                confirmLabel="Apply"
                onConfirm={(newValue: string) => {
                    const value = parseFloat(newValue);
                    if (updateCalibrationValue('x', 'value1', value)) {
                        setX1Text(String(value));
                    } else {
                        setX1Text(String(calibration.x.value1));
                    }
                    setCalibratedState(true);
                    onDirtyChanged(true);
                    setChangeValueX1Visible(false);
                }}
                onCancel={() => setChangeValueX1Visible(false)}
            />

            <TextInputModal
                visible={changeValueY0Visible}
                title="Enter new value for Y0"
                initialValue={y0Text}
                confirmLabel="Apply"
                onConfirm={(newValue: string) => {
                    const value = parseFloat(newValue);
                    if (updateCalibrationValue('y', 'value0', value)) {
                        setY0Text(String(value));
                    } else {
                        setY0Text(String(calibration.y.value0));
                    }
                    setCalibratedState(true);
                    onDirtyChanged(true);
                    setChangeValueY0Visible(false);
                }}
                onCancel={() => setChangeValueY0Visible(false)}
            />

            <TextInputModal
                visible={changeValueY1Visible}
                title="Enter new value for Y1"
                initialValue={y1Text}
                confirmLabel="Apply"
                onConfirm={(newValue: string) => {
                    const value = parseFloat(newValue);
                    if (updateCalibrationValue('y', 'value1', value)) {
                        setY1Text(String(value));
                    } else {
                        setY1Text(String(calibration.y.value1));
                    }
                    setCalibratedState(true);
                    onDirtyChanged(true);
                    setChangeValueY1Visible(false);
                }}
                onCancel={() => setChangeValueY1Visible(false)}
            />
        </>
    );
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
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    input: {
        borderBottomWidth: 1,
        padding: 5,
        width: 100,
        textAlign: 'right',
        backgroundColor: 'white',
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
});
