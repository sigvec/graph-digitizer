import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    Switch,
    Pressable,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import AppIcon from '../AppIcon';
import IconButton from '../IconButton';
import { AxisScale } from '../../calibration/constants'
import { TextInputModal } from '../Modals'
import { Calibration } from '../../calibration/types'

interface Props {
    updateCalibrationValue: (axis: string, key: string, value: number | string | AxisScale) => boolean,
    calibration: Calibration,
    setCalibration: React.Dispatch<React.SetStateAction<Calibration>>,
    mode: string,
    setMode: React.Dispatch<React.SetStateAction<string>>,
    calibratedState: boolean,
    setCalibratedState: React.Dispatch<React.SetStateAction<boolean>>,
    setDirty: React.Dispatch<React.SetStateAction<boolean>>,
    nudgeCalibrationPoint: (mode: string, dx: number, dy: number) => void,
    zoomDisplay: number,
}

export default function CalibrationTab({
    updateCalibrationValue,
    calibration,
    setCalibration,
    mode,
    setMode,
    calibratedState,
    setCalibratedState,
    setDirty,
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
    }, [
        calibration.x.value0,
        calibration.x.value1,
        calibration.y.value0,
        calibration.y.value1,
    ]);

    return <>
        <ScrollView
            style={styles.workspaceToolbarContainer}
        >

            <View style={styles.workspaceToolBackground}>
                <View style={[
                    styles.axisInputs,
                    {
                        backgroundColor: "#f5f5f5",
                        padding: 10,
                        borderRadius: 10,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: "#e5e5e5"
                    }
                ]
                }>
                    <Text>
                        X axis
                    </Text>

                    <View style={
                        { flex: 1 }
                    }>
                        <View style={[
                            styles.axisInputs,
                            { margin: 5 }
                        ]
                        }>
                            <Text>X0:</Text>
                            <Pressable
                                onPress={() => setChangeValueX0Visible(true)}>
                                <Text style={styles.input}>
                                    {x0Text}
                                </Text>
                            </Pressable>
                            <Text>X1:</Text>
                            <Pressable
                                onPress={() => setChangeValueX1Visible(true)}>
                                <Text style={styles.input}>
                                    {x1Text}
                                </Text>
                            </Pressable>
                        </View>

                        <View style={styles.axisInputs}>
                            <View style={[
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: "#efefef",
                                    borderRadius: 10,
                                    paddingHorizontal: 8
                                }
                            ]
                            }>
                                <Text>Use origin as X0</Text>
                                <Switch
                                    value={calibration.x.p0 === null}
                                    onValueChange={() => {
                                        const prevCalibrationPoint = calibration.x;
                                        let newCalibrationPoint;

                                        if (calibration.x.p0 === null) {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                p0: (calibration.origin.x + calibration.x.p1) / 2
                                            };
                                        } else {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                p0: null
                                            };
                                            if (mode === 'x0') { setMode('origin') }
                                        }
                                        setCalibration(prev => ({
                                            ...prev,
                                            x: newCalibrationPoint,
                                        }));
                                        setCalibratedState(true)
                                        setDirty(true)
                                    }
                                    }
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
                                                scaleType: AxisScale.LINEAR
                                            };
                                        } else {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                scaleType: AxisScale.LOG
                                            };
                                        }
                                        setCalibration(prev => ({
                                            ...prev,
                                            x: newCalibrationPoint,
                                        }));
                                        setCalibratedState(true)
                                        setDirty(true)
                                    }
                                    }
                                />
                            </View>
                        </View>
                    </View>
                </View>
                <View style={[
                    styles.axisInputs,
                    {
                        backgroundColor: "#f5f5f5",
                        padding: 10,
                        borderRadius: 10,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: "#e5e5e5"
                    }
                ]
                }>
                    <Text>
                        Y axis
                    </Text>
                    <View style={
                        { flex: 1 }
                    }>
                        <View style={[
                            styles.axisInputs,
                            { margin: 5 }
                        ]
                        }>

                            <Text>Y0:</Text>
                            <Pressable
                                onPress={() => setChangeValueY0Visible(true)}>
                                <Text style={styles.input}>
                                    {y0Text}
                                </Text>
                            </Pressable>
                            <Text>Y1:</Text>
                            <Pressable
                                onPress={() => setChangeValueY1Visible(true)}>
                                <Text style={styles.input}>
                                    {y1Text}
                                </Text>
                            </Pressable>
                        </View>
                        <View style={styles.axisInputs}>
                            <View style={[
                                {
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: "#efefef",
                                    borderRadius: 10,
                                    paddingHorizontal: 8
                                }
                            ]
                            }>
                                <Text>Use origin as Y0</Text>
                                <Switch
                                    value={calibration.y.p0 === null}
                                    onValueChange={() => {
                                        const prevCalibrationPoint = calibration.y;
                                        let newCalibrationPoint;

                                        if (calibration.y.p0 === null) {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                p0: (calibration.origin.y + calibration.y.p1) / 2
                                            };
                                        } else {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                p0: null
                                            };
                                            if (mode === 'y0') { setMode('origin') }
                                        }
                                        setCalibration(prev => ({
                                            ...prev,
                                            y: newCalibrationPoint,
                                        }));
                                        setCalibratedState(true)
                                        setDirty(true)
                                    }
                                    }
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
                                                scaleType: AxisScale.LINEAR
                                            };
                                        } else {
                                            newCalibrationPoint = {
                                                ...prevCalibrationPoint,
                                                scaleType: AxisScale.LOG
                                            };
                                        }
                                        setCalibration(prev => ({
                                            ...prev,
                                            y: newCalibrationPoint,
                                        }));
                                        setCalibratedState(true)
                                        setDirty(true)
                                    }
                                    }
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <Text>Nudge:</Text>
                <View style={styles.calibrationRow}>

                    <View style={[
                        styles.calibrationCell,
                        {
                            flex: 1.5,
                            marginRight: 4
                        },
                    ]}
                    >
                        <IconButton
                            label="[Origin]"
                            onPress={() => setMode('origin')}
                            selected={mode === 'origin'}
                        />
                        {!calibratedState && (
                            <View style={
                                { justifyContent: 'center' }
                            }>
                                <AppIcon
                                    name={"alert"}
                                    size={14}
                                    colour={'#d65910'}
                                />
                                <Text style={{ color: '#d65910' }}>
                                    (Default)
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={
                        { flex: 1 }
                    }>
                        <View style={[
                            styles.calibrationCell,
                        ]}>
                            <IconButton
                                label="[X0]"
                                onPress={() => {
                                    if (calibration.x.p0 !== null) {
                                        setMode('x0')
                                    }
                                }}
                                selected={mode === 'x0'}
                                disabled={calibration.x.p0 === null}
                            />
                            <IconButton
                                label="[Y0]"
                                onPress={() => {
                                    if (calibration.y.p0 !== null) {
                                        setMode('y0')
                                    }
                                }}
                                selected={mode === 'y0'}
                                disabled={calibration.y.p0 === null}
                            />
                        </View>
                        <View style={[
                            styles.calibrationCell,
                        ]}>

                        </View>
                    </View>
                    <View style={
                        { flex: 1 }
                    }>
                        <View style={[
                            styles.calibrationCell,
                        ]}>
                            <IconButton
                                label="[X1]"
                                onPress={() => setMode('x1')}
                                selected={mode === 'x1'}
                            />
                        </View>
                        <View style={[
                            styles.calibrationCell,
                        ]}>
                            <IconButton
                                label="[Y1]"
                                onPress={() => setMode('y1')}
                                selected={mode === 'y1'}
                            />
                        </View>
                    </View>


                    <View style={styles.pointControls}>
                        <IconButton
                            icon="nudgeLeft"
                            onPress={() => nudgeCalibrationPoint(mode, -1 / zoomDisplay, 0)}
                            disabled={mode[0] === 'y'}
                        />
                        <View>
                            <IconButton
                                icon="nudgeUp"
                                onPress={() => nudgeCalibrationPoint(mode, 0, -1 / zoomDisplay)}
                                disabled={mode[0] === 'x'}
                            />
                            <IconButton
                                icon="nudgeDown"
                                onPress={() => nudgeCalibrationPoint(mode, 0, 1 / zoomDisplay)}
                                disabled={mode[0] === 'x'}
                            />
                        </View>
                        <IconButton
                            icon="nudgeRight"
                            onPress={() => nudgeCalibrationPoint(mode, 1 / zoomDisplay, 0)}
                            disabled={mode[0] === 'y'}
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
                if (updateCalibrationValue("x", "value0", value)) {
                    setX0Text(String(value));
                } else {
                    setX0Text(String(calibration.x.value0));
                }
                setCalibratedState(true)
                setDirty(true)
                setChangeValueX0Visible(false);
            }}
            onCancel={() =>
                setChangeValueX0Visible(false)
            }
        />

        <TextInputModal
            visible={changeValueX1Visible}
            title="Enter new value for X1"
            initialValue={x1Text}
            confirmLabel="Apply"
            onConfirm={(newValue: string) => {
                const value = parseFloat(newValue);
                if (updateCalibrationValue("x", "value1", value)) {
                    setX1Text(String(value));
                } else {
                    setX1Text(String(calibration.x.value1));
                }
                setCalibratedState(true)
                setDirty(true)
                setChangeValueX1Visible(false);
            }}
            onCancel={() =>
                setChangeValueX1Visible(false)
            }
        />

        <TextInputModal
            visible={changeValueY0Visible}
            title="Enter new value for Y0"
            initialValue={y0Text}
            confirmLabel="Apply"
            onConfirm={(newValue: string) => {
                const value = parseFloat(newValue);
                if (updateCalibrationValue("y", "value0", value)) {
                    setY0Text(String(value));
                } else {
                    setY0Text(String(calibration.y.value0));
                }
                setCalibratedState(true)
                setDirty(true)
                setChangeValueY0Visible(false);
            }}
            onCancel={() =>
                setChangeValueY0Visible(false)
            }
        />

        <TextInputModal
            visible={changeValueY1Visible}
            title="Enter new value for Y1"
            initialValue={y1Text}
            confirmLabel="Apply"
            onConfirm={(newValue: string) => {
                const value = parseFloat(newValue);
                if (updateCalibrationValue("y", "value1", value)) {
                    setY1Text(String(value));
                } else {
                    setY1Text(String(calibration.y.value1));
                }
                setCalibratedState(true)
                setDirty(true)
                setChangeValueY1Visible(false);
            }}
            onCancel={() =>
                setChangeValueY1Visible(false)
            }
        />

    </>
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
})