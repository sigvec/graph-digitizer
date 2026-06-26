import {
    Pressable,
    StyleSheet,
    Text
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import AppIcon from './AppIcon'

export default function TabButton({
    icon,
    label,
    onPress,
    active
}) {

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,

                pressed &&
                !active &&
                styles.buttonPressed,

                active &&
                styles.buttonActive,
            ]}
        >
            {icon && (
                <AppIcon name={icon} />
            )}

            {label && (
                <Text style={({ pressed }) => [
                    styles.buttonText,

                    pressed &&
                    !active &&
                    styles.buttonPressed,

                    active &&
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

        backgroundColor: COLOURS.button,

        borderWidth: 1,
        borderColor: COLOURS.border,

        opacity: 0.4,
    },

    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },

    buttonText: {
        marginLeft: 8,
    },

    buttonActive: {
        opacity: 1,
        backgroundColor: COLOURS.surface,
        borderBottomColor: COLOURS.surface,
    },
})