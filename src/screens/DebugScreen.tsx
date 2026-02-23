import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { AppLayout } from "../components/layout";
import { DatabaseVisualization } from "../components/debug/DatabaseVisualization";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { SyncService } from "../services/SyncService";

export const DebugScreen: React.FC = () => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [isSyncing, setIsSyncing] = useState(false);

    const handleForceFullSync = async () => {
        Alert.alert(
            "Force Full Sync",
            "This will reset your local sync cursor and re-download ALL data from Supabase — including any records you added manually in the backend. This may take a moment.\n\nProceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Re-Sync Everything",
                    style: "destructive",
                    onPress: async () => {
                        setIsSyncing(true);
                        try {
                            await SyncService.forceFullSync();
                            Alert.alert("✅ Done", "Full re-sync completed. Your calendar, tasks, and vault data should now reflect the latest Supabase state.");
                        } catch (err: any) {
                            Alert.alert("Sync Error", err?.message || "An unknown error occurred.");
                        } finally {
                            setIsSyncing(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <AppLayout>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={[styles.section, { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sync Tools</Text>
                    <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
                        If records added directly in Supabase are not showing up in the app, tap "Force Full Re-Sync" to reset the sync cursor and re-download all data.
                    </Text>
                    <Pressable
                        style={[styles.syncButton, { backgroundColor: colors.primary, borderRadius: radius.md, opacity: isSyncing ? 0.7 : 1 }]}
                        onPress={handleForceFullSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <ActivityIndicator color={colors.primaryForeground} size="small" />
                        ) : (
                            <Text style={[styles.syncButtonText, { color: colors.primaryForeground }]}>
                                🔁 Force Full Re-Sync
                            </Text>
                        )}
                    </Pressable>
                </View>

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
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 4,
    },
    syncButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    syncButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
