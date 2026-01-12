import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { useSidebar } from "../contexts/SidebarContext";
import {
    ChevronLeft,
    Shield,
    Lock,
    Eye,
    Fingerprint,
    Key,
    Trash2,
    ChevronRight
} from "lucide-react-native";

// --- Data ---
const securitySettings = [
    { id: 'bio', icon: Fingerprint, label: 'Biometric Lock', description: 'Use fingerprint or face to unlock', enabled: true },
    { id: 'app', icon: Lock, label: 'App Lock', description: 'Require PIN when opening app', enabled: false },
    { id: 'hide', icon: Eye, label: 'Hide Sensitive Data', description: 'Blur amounts and personal info', enabled: false },
];

export const PrivacyScreen: React.FC = () => {
    const navigation = useNavigation();
    const { openSidebar } = useSidebar();
    const colors = useThemeColors();
    const radius = useThemeRadius();

    // State management for toggles
    const [settingsState, setSettingsState] = useState(
        securitySettings.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.enabled }), {}) as Record<string, boolean>
    );

    const toggleSetting = (id: string) => {
        setSettingsState(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <AppLayout>
            <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={[styles.iconButton, { borderRadius: radius.sm }]}>
                        <ChevronLeft size={24} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy & Security</Text>
                </View>

                {/* Security Status Card */}
                {/* Simulated gradient or primary color */}
                <View style={[styles.statusCard, { backgroundColor: colors.primary, borderRadius: radius.card }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <View style={[styles.statusIconBg, { borderRadius: radius.card }]}>
                            <Shield size={28} color={colors.primaryForeground} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statusTitle, { color: colors.primaryForeground }]}>Security Status</Text>
                            <Text style={[styles.statusSubtitle, { color: colors.primaryForeground }]}>Your data is protected</Text>
                        </View>
                        <Text style={{ fontSize: 24 }}>🔒</Text>
                    </View>
                </View>

                {/* Security Settings */}
                <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Security</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
                        {securitySettings.map((item, index) => (
                            <View key={item.id}>
                                <View style={styles.settingRow}>
                                    <View style={[styles.iconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                                        <item.icon size={20} color={colors.mutedForeground} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.settingLabel, { color: colors.foreground }]}>{item.label}</Text>
                                        <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                                    </View>
                                    <Switch
                                        value={settingsState[item.id]}
                                        onValueChange={() => toggleSetting(item.id)}
                                        trackColor={{ false: colors.muted, true: colors.primary }}
                                    />
                                </View>
                                {index !== securitySettings.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Access */}
                <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Access</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
                        <Pressable style={styles.accessRow}>
                            <View style={[styles.iconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                                <Key size={20} color={colors.mutedForeground} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Change Password</Text>
                                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>Last changed 30 days ago</Text>
                            </View>
                            <ChevronRight size={20} color={colors.mutedForeground} />
                        </Pressable>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Pressable style={styles.accessRow}>
                            <View style={[styles.iconBox, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                                <Lock size={20} color={colors.mutedForeground} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingLabel, { color: colors.foreground }]}>Set PIN Code</Text>
                                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>4-digit PIN for quick access</Text>
                            </View>
                            <ChevronRight size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>
                </View>

                {/* Data Privacy */}
                <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data Privacy</Text>
                    <View style={[styles.softCard, { backgroundColor: colors.muted, borderRadius: radius.card }]}>
                        <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                            Your data is encrypted and stored securely. We never share your personal information with third parties.
                        </Text>
                        <View style={styles.tagsRow}>
                            <View style={[styles.tag, { backgroundColor: '#dcfce7', borderRadius: radius.full }]}>
                                <Text style={[styles.tagText, { color: '#166534' }]}>🔐 End-to-end encrypted</Text>
                            </View>
                            <View style={[styles.tag, { backgroundColor: '#e0f2fe', borderRadius: radius.full }]}>
                                <Text style={[styles.tagText, { color: '#075985' }]}>☁️ Secure cloud backup</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={[styles.dangerCard, { backgroundColor: colors.card, borderColor: '#fee2e2', borderRadius: radius.card }]}>
                    <Text style={[styles.dangerTitle, { color: '#ef4444' }]}>Danger Zone</Text>
                    <Pressable style={[styles.deleteButton, { borderColor: '#fca5a5', backgroundColor: '#fff', borderRadius: radius.sm }]}>
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={[styles.deleteText, { color: "#ef4444" }]}>Delete Account</Text>
                    </Pressable>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </AppLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    iconButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    statusCard: {
        padding: 16,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statusIconBg: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statusSubtitle: {
        fontSize: 14,
        opacity: 0.9,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        marginTop: 4,
    },
    card: {
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
    },
    accessRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    settingDesc: {
        fontSize: 12,
    },
    divider: {
        height: 1,
        marginLeft: 64, // Align with text
    },
    softCard: {
        padding: 16,
        marginBottom: 20,
    },
    privacyText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dangerCard: {
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    dangerTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        gap: 8,
    },
    deleteText: {
        fontWeight: '500',
        fontSize: 14,
    },
});
