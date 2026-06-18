import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import AppIcon from './AppIcon'

export default function IconButton({
    icon,
    label,
    onPress,
    selected = false,
    alert = false,
    disabled = false,
}) {

    const iconColour =
        disabled
            ? COLOURS.buttonIconInactive
            : COLOURS.buttonIcon

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,

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
                        color={iconColour}
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