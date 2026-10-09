import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLOURS, SPACING, TYPOGRAPHY } from '../../theme';
import IconButton from '../IconButton';
import type { Dataset } from '../../datasets/types';

type TracePhase = 'idle' | 'awaitingDirection' | 'preview';

interface Props {
    tracePhase: TracePhase;
    directionMode: 'manual' | 'automatic';
    onDirectionModeChange: (mode: 'manual' | 'automatic') => void;
    onStartTrace: () => void;
    onCancelTrace: () => void;
    onAcceptTrace: () => void;
    activeDataset: Dataset;
    tracePointCount: number;
    hasTraceStart: boolean;
}

export default function TraceTab({
    tracePhase,
    directionMode,
    onDirectionModeChange,
    onStartTrace,
    onCancelTrace,
    onAcceptTrace,
    activeDataset,
    tracePointCount,
    hasTraceStart,
}: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Curve tracing</Text>
            <Text style={styles.description}>
                Trace a continuous curve from the image into the active dataset. The app traces in
                both directions from the selected point.
            </Text>

            {tracePhase === 'idle' && (
                <>
                    <Text style={styles.modeLabel}>Direction setting</Text>
                    <View style={styles.modeOptions}>
                        <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ checked: directionMode === 'manual' }}
                            style={styles.modeOption}
                            onPress={() => onDirectionModeChange('manual')}
                        >
                            <View style={styles.radioOuter}>
                                {directionMode === 'manual' && <View style={styles.radioInner} />}
                            </View>
                            <View style={styles.modeText}>
                                <Text style={styles.optionTitle}>Manual</Text>
                                <Text style={styles.optionDescription}>
                                    Choose the direction with a second tap
                                </Text>
                            </View>
                        </Pressable>
                        <Pressable
                            accessibilityRole="radio"
                            accessibilityState={{ checked: directionMode === 'automatic' }}
                            style={styles.modeOption}
                            onPress={() => onDirectionModeChange('automatic')}
                        >
                            <View style={styles.radioOuter}>
                                {directionMode === 'automatic' && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>
                            <View style={styles.modeText}>
                                <Text style={styles.optionTitle}>Automatic</Text>
                                <Text style={styles.optionDescription}>
                                    Try to determine the direction from one tap
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                    <IconButton
                        icon="add"
                        label="Start Trace"
                        onPress={onStartTrace}
                        disabled={activeDataset.locked || !activeDataset.visible}
                    />
                </>
            )}

            {tracePhase === 'awaitingDirection' && (
                <>
                    {(directionMode === 'manual' || hasTraceStart) && (
                        <Text style={styles.stepHeading}>
                            {hasTraceStart
                                ? 'Tap 2: Set the tracing direction'
                                : 'Tap 1: Select the starting point'}
                        </Text>
                    )}
                    <Text style={styles.status}>
                        {hasTraceStart
                            ? 'Tap a second point along the curve, in the direction you want the trace to follow.'
                            : directionMode === 'automatic'
                              ? 'Tap the curve where you want tracing to begin. The app will try to determine the direction automatically; if it cannot, you will be asked to set it manually.'
                              : 'Tap the curve where you want tracing to begin.'}
                    </Text>
                    <IconButton icon="delete" label="Cancel Trace" onPress={onCancelTrace} />
                </>
            )}

            {tracePhase === 'preview' && (
                <>
                    <Text style={styles.status}>
                        Preview contains {tracePointCount} points. Accepting keeps approximately
                        every tenth point in the dataset.
                    </Text>
                    <View style={styles.actions}>
                        <View style={styles.action}>
                            <IconButton
                                icon="check"
                                label="Accept Trace"
                                onPress={onAcceptTrace}
                                disabled={activeDataset.locked || !activeDataset.visible}
                            />
                        </View>
                        <View style={styles.action}>
                            <IconButton
                                icon="delete"
                                label="Discard Trace"
                                onPress={onCancelTrace}
                            />
                        </View>
                    </View>
                </>
            )}

            {activeDataset.locked && (
                <Text style={styles.status}>The active dataset is locked.</Text>
            )}
            {!activeDataset.visible && (
                <Text style={styles.status}>The active dataset is hidden.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        backgroundColor: COLOURS.surface,
        borderRadius: 10,
        gap: 8,
    },
    heading: {
        ...TYPOGRAPHY.body,
        color: COLOURS.text,
        fontWeight: '600',
    },
    description: {
        ...TYPOGRAPHY.small,
        color: COLOURS.text,
    },
    status: {
        ...TYPOGRAPHY.small,
        color: COLOURS.muted,
    },
    modeLabel: {
        ...TYPOGRAPHY.small,
        color: COLOURS.text,
        fontWeight: '600',
        marginTop: 4,
    },
    modeOptions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    modeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 6,
        gap: 8,
        minWidth: 0,
    },
    radioOuter: {
        marginTop: 2,
        flexShrink: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLOURS.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLOURS.text,
    },
    modeText: {
        flex: 1,
        gap: 2,
    },
    optionTitle: {
        ...TYPOGRAPHY.body,
        color: COLOURS.text,
    },
    optionDescription: {
        ...TYPOGRAPHY.small,
        color: COLOURS.muted,
    },
    stepHeading: {
        ...TYPOGRAPHY.body,
        color: COLOURS.text,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    action: {
        flex: 1,
    },
});
