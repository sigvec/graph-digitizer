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
    style
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


export function DatasetActionButton(props) {

    return (
        <IconButton
            {...props}
            style={styles.datasetButton}
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