import React, { useState, useEffect } from "react";
import {
    View,
    StyleSheet,
    Text,
    TextInput,
    ScrollView,
    Switch,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../../theme";
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../../constants/geometry';
import AppIcon from '../AppIcon';
import IconButton from '../IconButton';
import { AxisScale } from '../../calibration/constants'

export default function CalibrationTab({
    updateCalibrationValue,
    calibration,
    setCalibration,
    mode,
    setMode,
    calibratedState,
    setCalibrationState,
    nudgeCalibrationPoint,
    zoomDisplay,
    updateX0Text,
    updateY0Text,
}) {

    const [x0Text, setX0Text] = useState(String(calibration.x.value0));
    const [x1Text, setX1Text] = useState(String(calibration.x.value1));
    const [y0Text, setY0Text] = useState(String(calibration.y.value0));
    const [y1Text, setY1Text] = useState(String(calibration.y.value1));

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

    return <ScrollView
        style={styles.workspaceToolbarContainer}
        vertical
    >

        <View style={styles.workspaceToolBackground}>


            <View style={styles.axisInputs}>
                <Text>X0:</Text>
                <TextInput
                    style={styles.input}
                    value={x0Text}
                    onChangeText={setX0Text}
                    onEndEditing={({ nativeEvent }) => {
                        const value = parseFloat(nativeEvent.text);
                        if (updateCalibrationValue("x", "value0", value)) {
                            setX0Text(String(value));
                        } else {
                            setX0Text(String(calibration.x.value0));
                        }
                    }} />
                <Text>X1:</Text>
                <TextInput
                    style={styles.input}
                    value={x1Text}
                    onChangeText={setX1Text}
                    onEndEditing={({ nativeEvent }) => {
                        const value = parseFloat(nativeEvent.text);
                        if (updateCalibrationValue("x", "value1", value)) {
                            setX1Text(String(value));
                        } else {
                            setX1Text(String(calibration.x.value1));
                        }
                    }} />
                <View style={[
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: "#efefef",
                        borderRadius: 10,
                        paddingHorizontal: 4
                    }
                ]
                }>
                    <Text>2 point</Text>
                    <Switch
                        value={calibration.x.p0 !== null}
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
                        }
                        }
                    />
                </View>
            </View>
            <View style={styles.axisInputs}>

                <Text>Y0:</Text>
                <TextInput
                    style={styles.input}
                    value={y0Text}
                    onChangeText={setY0Text}
                    onEndEditing={({ nativeEvent }) => {
                        const value = parseFloat(nativeEvent.text);
                        if (updateCalibrationValue("y", "value0", value)) {
                            setY0Text(String(value));
                        } else {
                            setY0Text(String(calibration.y.value0));
                        }
                    }} />
                <Text>Y1:</Text>
                <TextInput
                    style={styles.input}
                    value={y1Text}
                    onChangeText={setY1Text}
                    onEndEditing={({ nativeEvent }) => {
                        const value = parseFloat(nativeEvent.text);
                        if (updateCalibrationValue("y", "value1", value)) {
                            setY1Text(String(value));
                        } else {
                            setY1Text(String(calibration.y.value1));
                        }
                    }} />
                <View style={[
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: "#efefef",
                        borderRadius: 10,
                        paddingHorizontal: 4
                    }
                ]
                }>
                    <Text>2 point</Text>
                    <Switch
                        value={calibration.y.p0 !== null}
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
                        }
                        }
                    />
                </View>
            </View>

            <Text>Nudge:</Text>
            <View style={styles.calibrationRow}>
                <View style={[
                    styles.calibrationCell,
                ]}
                >
                    <IconButton
                        label="[Origin]"
                        onPress={() => setMode('origin')}
                        selected={mode === 'origin'}
                    />
                    {!calibratedState && (
                        <View style={[
                            styles.statusBarIndicator,
                            { justifyContent: 'center' }
                        ]}>
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
                </View>
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
                <IconButton
                    icon="nudgeRight"
                    onPress={() => nudgeCalibrationPoint(mode, 1 / zoomDisplay, 0)}
                    disabled={mode[0] === 'y'}
                />
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

        </View>
    </ScrollView>
}


const styles = StyleSheet.create({
    workspaceToolContainer: {
        flex: 1,
        paddingHorizontal: 8,
        backgroundColor: COLOURS.surfaceToolsContiner,
        borderBottomWidth: 1,
        borderColor: COLOURS.border,
    },

    workspaceToolBackground: {
        flex: 1,
        alignItems: 'start',
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
        borderWidth: 1,
        padding: 3,
        width: 50
    },

    calibrationRow: {
        flexDirection: 'row',
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
        marginHorizontal: 8,
        marginVertical: 8,
    },
})