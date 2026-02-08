import React from "react";
import { ScrollView, StyleSheet, View, Text } from "react-native";
import { AppLayout } from "../components/layout";
import { DatabaseVisualization } from "../components/debug/DatabaseVisualization";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";

export const DebugScreen: React.FC = () => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    return (
        <AppLayout>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={[styles.section, { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Database Status</Text>
                    <DatabaseVisualization />
                </View>
            </ScrollView>
        </AppLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
    },
    section: {
        padding: 16,
        borderWidth: 1,
        gap: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    }
});
