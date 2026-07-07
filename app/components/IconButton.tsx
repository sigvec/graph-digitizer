import type { ReactNode } from "react";
import {
    StyleProp,
    ViewStyle,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import AppIcon from './AppIcon'

interface IconButtonProps {
    icon?: ReactNode;
    label?: string;
    onPress: () => void;
    selected?: boolean;
    alert?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

export default function IconButton({
    icon = null,
    label,
    onPress,
    selected = false,
    alert = false,
    disabled = false,
    style = null
}: IconButtonProps) {

    const iconColour =
        disabled
            ? COLOURS.buttonIconInactive
            : COLOURS.buttonIcon

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                style,

                pressed &&
                !disabled &&
                styles.buttonPressed,

                !selected && styles.buttonNormal,
                selected && styles.buttonSelected
            ]}
        >

            {icon && (
                <View style={
                    [
                        label && styles.iconContainer,
                        disabled && styles.buttonDisabled,
                    ]
                }>
                    <AppIcon
                        name={icon}
                        colour={iconColour}
                    />
                </View>
            )}

            {icon && label && (
                <View style={styles.gap} />
            )}

            {label && (
                <Text style={[
                    styles.buttonText,
                    selected && styles.buttonTextSelected,

                    disabled &&
                    styles.buttonDisabled,

                ]}
                >
                    {label}
                </Text>
            )}

        </Pressable>
    );
}


export function DatasetActionButton({
    style,
    ...props
}: IconButtonProps) {
    return (
        <IconButton
            {...props}
            style={[styles.datasetButton, style]}
        />
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',

        minWidth: 44,
        minHeight: 44,

        paddingHorizontal: 8,
        paddingVertical: 8,

        borderRadius: 8,

        borderWidth: 1,
    },

    datasetButton: {
        flexDirection: 'column',
        paddingHorizontal: 2,
    },

    buttonNormal: {
        backgroundColor: COLOURS.buttonBackground,
        borderColor: COLOURS.buttonBorder,
    },

    buttonSelected: {
        backgroundColor: COLOURS.buttonIcon,
        borderColor: COLOURS.buttonBorder,
    },

    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },

    buttonText: {
    },

    buttonTextSelected: {
        color: '#ffffff',
    },

    buttonDisabled: {
        opacity: 0.4,
    },

    iconContainer: {
    },

    gap: {
        width: 6,
    },
})