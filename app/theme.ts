import {
    TextStyle
} from "react-native";

export const COLOURS = {
    background: '#ffffff',

    surface: '#f7f7f7',
    surfaceAlt: '#f1f1f1',
    surfaceToolsContainer: '#eeecec',
    toolsContainerBorder: '#a01919',

    buttonIcon: '#003796',
    buttonIconInactive: '#5b5b5b',
    buttonBackground: '#efefef',
    buttonBorder: '#ffffff00',

    border: '#dddddd',

    primary: '#4a90e2',
    danger: '#de120b',

    locked: '#a01919',
    alert: '#a01919',

    text: '#222222',
    muted: '#666666',

    canvas: '#1e1e1e',

    invisible: '#ffffff00',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
};

export const RADIUS = {
    sm: 8,
    md: 12,
    lg: 16,
};

export const TYPOGRAPHY = {
    title: {
        fontSize: 18,
        fontWeight: '700',
    },

    section: {
        fontSize: 15,
        fontWeight: '600',
    },

    label: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },

    body: {
        fontSize: 14,
    },

    small: {
        fontSize: 12,
    },
} satisfies Record<string, TextStyle>;