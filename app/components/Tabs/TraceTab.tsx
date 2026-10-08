import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLOURS, SPACING, TYPOGRAPHY } from '../../theme';
import IconButton from '../IconButton';
import type { Dataset } from '../../datasets/types';

type TracePhase = 'idle' | 'awaitingDirection' | 'preview';

interface Props {
    tracePhase: TracePhase;
    onStartTrace: () => void;
    onCancelTrace: () => void;
    onAcceptTrace: () => void;
    activeDataset: Dataset;
    tracePointCount: number;
}

export default function TraceTab({
    tracePhase,
    onStartTrace,
    onCancelTrace,
    onAcceptTrace,
    activeDataset,
    tracePointCount,
}: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Curve tracing</Text>
            <Text style={styles.description}>
                Trace a continuous curve from the image into the active dataset. Choose a start
                point on the curve, then tap a second point to indicate its direction. The app
                traces in both directions from the start point.
            </Text>

            {tracePhase === 'idle' && (
                <IconButton
                    icon="add"
                    label="Start Trace"
                    onPress={onStartTrace}
                    disabled={activeDataset.locked || !activeDataset.visible}
                />
            )}

            {tracePhase === 'awaitingDirection' && (
                <>
                    <Text style={styles.status}>
                        Tap a point on the curve, then tap another point in the direction you want
                        the trace to follow.
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
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    action: {
        flex: 1,
    },
});
