import {
    Pressable,
    StyleSheet,
    Text
} from "react-native";

import { COLOURS, SPACING, RADIUS, TYPOGRAPHY } from "../theme";

import AppIcon from './AppIcon'
import type { IconName } from "./icons";

interface Props {
    icon: IconName,
    label: string,
    onPress: () => void,
}

export default function MenuButton({
    icon,
    label,
    onPress
}: Props) {

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,

                pressed &&
                styles.buttonPressed,

            ]}
        >
            {icon && (
                <AppIcon name={icon} />
            )}


            {label && (
                <Text
                    style={styles.buttonText}
                    numberOfLines={1}
                    ellipsizeMode="middle"
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

        paddingVertical: 8,

        opacity: 1,
    },

    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },

    buttonText: {
        ...TYPOGRAPHY.section,
        marginLeft: 8,
    },
})