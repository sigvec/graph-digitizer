import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Modal
} from "react-native";


import IconButton from './IconButton'
import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from '../theme';
import { DATASET_COLOURS } from '../constants/colours';

// ===================================
// TextInputModal
// ===================================


export function TextInputModal({
    visible = false,
    title = '',
    initialValue = '',
    confirmLabel = 'OK',
    onConfirm,
    onCancel,
    message = null,
}) {


    const [text, setText] =
        useState(initialValue);

    useEffect(() => {
        setText(initialValue ?? '');
    }, [initialValue, visible]);

    function handleConfirm() {
        const value = text.trim();

        if (!value) return;

        onConfirm(value);
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>

                <View style={styles.modalCard}>

                    <Text style={styles.modalTitle}>
                        {title}
                    </Text>

                    <TextInput
                        style={styles.modalInput}
                        autoFocus
                        value={text}
                        onChangeText={setText}
                        onSubmitEditing={handleConfirm}
                    />

                    {message && (<Text style={styles.paragraph}>
                        {message}
                    </Text>
                    )}


                    <View style={styles.modalButtons}>

                        <IconButton
                            label="Cancel"
                            onPress={onCancel}
                        />

                        <IconButton
                            label={confirmLabel}
                            onPress={handleConfirm}
                        />

                    </View>

                </View>

            </View>
        </Modal>
    );
}

// ===================================
// ColourPickerModal
// ===================================


export function ColourPickerModal({
    visible = false,
    title = '',
    currentColour,
    setDatasetColour,
    onCancel,
}) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >

            <View style={styles.modalOverlay}>

                <View style={styles.modalCard}>

                    <Text style={styles.modalTitle}>
                        {title}
                    </Text>

                    <View style={styles.colourGrid}>

                        {DATASET_COLOURS.map(colour => (

                            <TouchableOpacity
                                key={colour}
                                onPress={() =>
                                    setDatasetColour(colour)
                                }
                                style={[
                                    styles.colourSwatch,
                                    {
                                        backgroundColor: colour,
                                    },

                                    currentColour === colour && {
                                        borderWidth: 3,
                                        borderColor: '#000000',
                                    },

                                ]}
                            />

                        ))}

                    </View>

                    <View style={styles.modalButtons}>

                        <IconButton
                            label="Cancel"
                            onPress={onCancel}
                        />

                    </View>

                </View>

            </View>
        </Modal>
    )
}

// ===================================
// ProjectMenuModal
// ===================================

export function ProjectMenuModal({
    visible = false,
    handleSave,
    handleSaveAs,
    handleRenameProject,
    handleCloseProject,
    handleNewProject,
    handleShareProject,
    handleImportProject,
    onCancel,
}) {

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.modalOverlay}>

                <View style={styles.modalCard}>

                    <IconButton
                        label="Save"
                        onPress={handleSave}
                    />

                    <IconButton
                        label="Save As..."
                        onPress={handleSaveAs}
                    />

                    <IconButton
                        label="Rename Project"
                        onPress={handleRenameProject}
                    />

                    <IconButton
                        label="Close Project"
                        onPress={handleCloseProject}
                    />

                    <IconButton
                        label="New Project"
                        onPress={handleNewProject}
                    />

                    <IconButton
                        label="Share Project"
                        onPress={handleShareProject}
                    />

                    <IconButton
                        label="Import Project"
                        onPress={handleImportProject}
                    />

                    <IconButton
                        label="Cancel"
                        onPress={onCancel}
                    />

                </View>

            </View>
        </Modal>
    );
}

// ===================================
// Dialog
// ===================================

export function Dialog({
    visible = false,
    title = "",
    children,
    buttons
}) {

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>

                    <Text style={styles.modalTitle}>
                        {title}
                    </Text>

                    <View style={
                        buttons && {
                            marginBottom: 12
                        }
                    }>
                        {children}
                    </View>

                    {buttons && <View style={styles.modalButtons}>
                        {buttons.map(button => (
                            <IconButton
                                key={button.text}
                                label={button.text}
                                onPress={button.onPress}
                            />
                        ))}
                    </View>
                    }

                </View>
            </View>
        </Modal>
    );
}


// ===================================
// Styles
// ===================================

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    modalCard: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        gap: 10
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },

    modalInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
    },

    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    colourGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },

    colourSwatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    paragraph: {
        marginBottom: 16,
    },

});