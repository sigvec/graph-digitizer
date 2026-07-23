import React from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CircleX } from "lucide-react-native";

interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
}

function HelpSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {children}
        </View>
    );
}

export default function HelpModal({
    visible,
    onClose,
}: HelpModalProps) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Help</Text>

                    <TouchableOpacity onPress={onClose}>
                        <CircleX size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.intro}>
                        Graph Digitizer extracts numerical data from graph images. The
                        typical workflow is:
                    </Text>

                    <View style={styles.workflow}>
                        <Text style={styles.workflowItem}>📷 Import Image</Text>
                        <Text style={styles.arrow}>↓</Text>
                        <Text style={styles.workflowItem}>🎯 Calibrate</Text>
                        <Text style={styles.arrow}>↓</Text>
                        <Text style={styles.workflowItem}>➕ Add Points</Text>
                        <Text style={styles.arrow}>↓</Text>
                        <Text style={styles.workflowItem}>✋ Refine Points</Text>
                        <Text style={styles.arrow}>↓</Text>
                        <Text style={styles.workflowItem}>📈 Analyse</Text>
                        <Text style={styles.arrow}>↓</Text>
                        <Text style={styles.workflowItem}>📄 Export or Share</Text>
                    </View>

                    <View style={styles.tip}>
                        <Text style={styles.tipTitle}>Tip</Text>
                        <Text style={styles.body}>
                            The <Text style={styles.bold}>Calibrate</Text> tab is used only
                            for calibration. To add, move or delete data points, switch to any
                            other tab.
                        </Text>
                    </View>

                    <HelpSection title="Import Image">
                        <Text style={styles.body}>
                            Tap <Text style={styles.bold}>Import Image</Text> to select a
                            graph from your device. Higher-resolution images generally produce
                            the best results.
                        </Text>
                    </HelpSection>

                    <HelpSection title="Calibrate">
                        <Text style={styles.body}>
                            Select the <Text style={styles.bold}>Calibrate</Text> tab before
                            positioning the calibration markers and entering their values.
                            Both linear and logarithmic axes are supported.
                        </Text>
                    </HelpSection>

                    <HelpSection title="Digitize">
                        <Text style={styles.body}>
                            Switch to any tab{" "}
                            <Text style={styles.bold}>other than Calibrate</Text> to add or
                            edit data points. Tap near the graph to create a point.
                        </Text>
                    </HelpSection>

                    <HelpSection title="Snap to Curve">
                        <Text style={styles.body}>
                            New points are automatically adjusted to the nearest
                            detected curve. You can always drag points afterwards to refine
                            their positions.
                        </Text>
                    </HelpSection>

                    <HelpSection title="Analyse">
                        <Text style={styles.body}>
                            Use interpolation or regression analysis to fit curves to your
                            digitized data.
                        </Text>
                    </HelpSection>

                    <HelpSection title="Save & Share">
                        <Text style={styles.body}>
                            Projects can be saved locally, shared using a public link, or
                            exported as CSV files for use in other applications.
                        </Text>
                    </HelpSection>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: "#ddd",
    },

    title: {
        fontSize: 24,
        fontWeight: "700",
    },

    content: {
        padding: 24,
        paddingBottom: 48,
    },

    intro: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
    },

    workflow: {
        alignItems: "center",
        marginBottom: 32,
    },

    workflowItem: {
        fontSize: 18,
        fontWeight: "600",
    },

    arrow: {
        fontSize: 22,
        marginVertical: 4,
    },

    tip: {
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        padding: 16,
        marginBottom: 32,
    },

    tipTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
    },

    section: {
        marginBottom: 28,
    },

    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 8,
    },

    body: {
        fontSize: 16,
        lineHeight: 24,
    },

    bold: {
        fontWeight: "600",
    },
});