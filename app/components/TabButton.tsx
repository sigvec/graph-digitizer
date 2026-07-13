import {
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import AppIcon from './AppIcon'
import type { IconName } from "./icons";

interface Props {
    icon: IconName,
    label: string,
    onPress: () => void,
    active: boolean,
}

export default function TabButton({
    icon,
    label,
    onPress,
    active
}: Props) {

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
            {({ pressed }) => (
                <>
                    {
                        icon && (
                            <AppIcon name={icon} />
                        )
                    }

                    {icon && label && (
                        <View style={styles.gap} />
                    )}

                    {
                        label && (
                            <Text style={[
                                styles.buttonText,

                                pressed &&
                                !active &&
                                styles.buttonPressed,

                            ]}
                            >
                                {label}
                            </Text>
                        )
                    }
                </>
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
        borderColor: COLOURS.border,

        opacity: 0.4,
    },

    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },

    buttonText: {
    },

    buttonActive: {
        opacity: 1,
        backgroundColor: COLOURS.surface,
        borderBottomColor: COLOURS.surface,
    },

    gap: {
        width: 8,
    },
})