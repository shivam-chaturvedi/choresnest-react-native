import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
    TouchableOpacity,
} from "react-native";
import { theme } from "../theme";
import { useThemeColors } from "../contexts/ThemeContext";
import { useFamily } from "../contexts/FamilyContext";
import { PROFILE_COLORS } from "../constants/profileColors";
import { AppIcon, AppIconName, isAppIconName } from "../components/ui/AppIcon";
import { AppSettingsService } from "../services/AppSettingsService";
import { MemberIcon } from "../components/ui";
import { MEMBER_ICON_OPTIONS, DEFAULT_MEMBER_ICON } from "../constants/memberIcons";

interface InitialSetupScreenProps {
    onComplete: () => void;
}

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onComplete }) => {
    const colors = useThemeColors();
    const radius = theme.radius;
    const { setFamilyName, addMember, updateMember, setActiveMember, removeMember, members, familyName } = useFamily();

    const [familyNameInput, setFamilyNameInput] = useState("Family");
    const [memberName, setMemberName] = useState("Admin");
    const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
    const [selectedEmoji, setSelectedEmoji] = useState<string>(DEFAULT_MEMBER_ICON);
    const [familyNameTouched, setFamilyNameTouched] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const scrollViewRef = useRef<ScrollView | null>(null);

    useEffect(() => {
        if (familyNameTouched) return;
        if (familyName && familyName !== "Family Chores") {
            setFamilyNameInput(familyName);
            return;
        }
        setFamilyNameInput("Family");
    }, [familyName, familyNameTouched]);

    const availableColors = React.useMemo(() => {
        const used = new Set(members.map((member: any) => member.color));
        const filtered = PROFILE_COLORS.filter((color) => !used.has(color.value));
        return filtered.length > 0 ? filtered : PROFILE_COLORS;
    }, [members]);

    useEffect(() => {
        if (!availableColors.some(c => c.value === selectedColor.value)) {
            setSelectedColor(availableColors[0]);
        }
    }, [availableColors, selectedColor.value]);

    const handleFamilyNameChange = (value: string) => {
        setFamilyNameInput(value);
        if (!familyNameTouched) {
            setFamilyNameTouched(true);
        }
    };

    const scrollToMemberForm = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
    };

    const handleMemberEdit = (member: any) => {
        setMemberName(member.name || "");
        setSelectedEmoji(member.symbol || DEFAULT_MEMBER_ICON);
        const matchingColor = PROFILE_COLORS.find((color) => color.value === member.color);
        setSelectedColor(matchingColor || PROFILE_COLORS[0]);
        setEditingMemberId(member.id);
        scrollToMemberForm();
    };

    const handleDeleteMember = (member: any) => {
        Alert.alert(
            "Delete Member",
            `Are you sure you want to remove ${member.name || "this member"}? This cannot be undone.`,
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeMember(member.id);
                            if (editingMemberId === member.id) {
                                setEditingMemberId(null);
                                setMemberName("");
                                setSelectedEmoji(DEFAULT_MEMBER_ICON);
                                setSelectedColor(PROFILE_COLORS[0]);
                            }
                        } catch (error) {
                            console.error("Failed to delete member:", error);
                            Alert.alert("Error", "Unable to remove member right now.");
                        }
                    },
                },
            ]
        );
    };

    const currentEditingMember = editingMemberId ? members.find((member: any) => member.id === editingMemberId) : null;

    const handleComplete = async () => {
        try {
            // Validate inputs
            if (!familyNameInput.trim()) {
                Alert.alert("Required", "Please enter a family name");
                return;
            }

            if (!memberName.trim()) {
                Alert.alert("Required", "Please enter your name");
                return;
            }

            // Set family name first — this is now async and will resolve the
            // auth session internally even if profileId state hasn't landed yet.
            await setFamilyName(familyNameInput.trim());

            // Add or Update first member (main user) — prevents duplicate profiles
            // when the setup screen is visited more than once (e.g. in guest mode).
            const payload = {
                name: memberName.trim(),
                symbol: selectedEmoji,
                color: selectedColor.value,
                isActive: true,
            };

            if (editingMemberId) {
                await updateMember(editingMemberId, payload);
                await setActiveMember({
                    id: editingMemberId,
                    name: payload.name,
                    symbol: payload.symbol,
                    color: payload.color,
                    isActive: true,
                });
            } else if (members.length > 0) {
                const primaryMember = members[0];
                await updateMember(primaryMember.id, payload);
                await setActiveMember({
                    ...primaryMember,
                    ...payload,
                    id: primaryMember.id,
                    name: payload.name,
                    symbol: payload.symbol,
                    color: payload.color,
                    isActive: true,
                });
            } else {
                await addMember(payload);
            }

            // Mark onboarding complete and navigate away
            await AppSettingsService.completeOnboarding();
            onComplete();

        } catch (error) {
            console.error("Error completing setup:", error);
            Alert.alert("Error", "Failed to complete setup. Please try again.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20', borderRadius: radius.xl }]}>
                        <AppIcon name="users" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Welcome! Let's Set Up
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Create your family profile to get started
                    </Text>
                </View>

                {/* Family Name Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                        Family Name
                    </Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                        placeholder="e.g., The Smiths, Our Family"
                        placeholderTextColor={colors.mutedForeground}
                        value={familyNameInput}
                        onChangeText={handleFamilyNameChange}
                        autoCapitalize="words"
                    />
                </View>

                {members.length > 0 && (
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                        <View style={styles.membersSectionHeader}>
                            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Family Members</Text>
                            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Tap the pencil to edit or the trash icon to delete</Text>
                        </View>
                        <View style={styles.memberList}>
                            {members.map((member: any) => (
                                <View key={member.id} style={[styles.memberRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                    <View style={styles.memberMeta}>
                                        <View style={[styles.memberAvatar, { backgroundColor: member.color || colors.muted }]}>
                                            <MemberIcon symbol={member.symbol} size={26} color={colors.foreground} />
                                        </View>
                                        <View>
                                            <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name || "Unnamed"}</Text>
                                            <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>
                                                {member.isActive ? "Active profile" : "Member"}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.memberActions}>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.memberActionButton,
                                                { opacity: pressed ? 0.6 : 1 }
                                            ]}
                                            onPress={() => handleMemberEdit(member)}
                                        >
                                            <AppIcon name="edit" size={20} color={member.id === editingMemberId ? colors.primary : colors.foreground} />
                                        </Pressable>
                                        <Pressable
                                            style={({ pressed }) => [
                                                styles.memberActionButton,
                                                { opacity: pressed ? 0.6 : 1, marginLeft: theme.spacing.sm }
                                            ]}
                                            onPress={() => handleDeleteMember(member)}
                                        >
                                            <AppIcon name="trash" size={20} color={colors.danger} />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Member Profile Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                        Your Profile
                    </Text>
                    <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                        This will be your main profile
                    </Text>
                    {editingMemberId && (
                        <Text style={[styles.editingNotice, { color: colors.primary }]}>
                            Editing {currentEditingMember?.name || "member"} — changes will update this profile.
                        </Text>
                    )}

                    {/* Name Input */}
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                        placeholder="Your name"
                        placeholderTextColor={colors.mutedForeground}
                        value={memberName}
                        onChangeText={setMemberName}
                        autoCapitalize="words"
                    />

                    {/* Icon Selection */}
                    <Text style={[styles.label, { color: colors.foreground }]}>Choose a Profile Icon</Text>
                    <View style={styles.emojiGrid}>
                        {MEMBER_ICON_OPTIONS.map((icon) => (
                            <TouchableOpacity
                                key={icon}
                                style={[
                                    styles.emojiButton,
                                    { backgroundColor: selectedEmoji === icon ? colors.primary + '20' : colors.muted, borderColor: selectedEmoji === icon ? colors.primary : colors.border, borderRadius: radius.md }
                                ]}
                                onPress={() => setSelectedEmoji(icon)}
                            >
                                <AppIcon source={icon} size={28} color={selectedEmoji === icon ? colors.primary : colors.foreground} />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Color Selection */}
                    <Text style={[styles.label, { color: colors.foreground }]}>
                        Choose Color
                    </Text>
                    <View style={styles.colorGrid}>
                        {availableColors.map((color) => (
                            <Pressable
                                key={color.id}
                                style={[
                                    styles.colorButton,
                                    { backgroundColor: color.hex, borderRadius: radius.md },
                                    selectedColor.id === color.id && [styles.colorButtonSelected, { borderColor: colors.foreground }]
                                ]}
                                onPress={() => setSelectedColor(color)}
                            >
                                {selectedColor.id === color.id && (
                                    <AppIcon name="check" size={16} color="#fff" />
                                )}
                            </Pressable>
                        ))}
                    </View>

                    {/* Preview */}
                    <View style={[styles.preview, { backgroundColor: colors.muted, borderRadius: radius.md }]}>
                        <View style={[styles.previewAvatar, { backgroundColor: selectedColor.hex, borderRadius: radius.md }]}>
                            <MemberIcon symbol={selectedEmoji} size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.previewName, { color: colors.foreground }]}>
                            {memberName || "Your Name"}
                        </Text>
                    </View>
                </View>

                {/* Complete Button */}
                <Pressable
                    style={[styles.completeButton, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
                    onPress={handleComplete}
                >
                    <Text style={[styles.completeButtonText, { color: colors.primaryForeground }]}>
                        Complete Setup →
                    </Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingTop: theme.spacing.xl * 2,
    },
    header: {
        alignItems: "center",
        marginBottom: theme.spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        marginBottom: theme.spacing.xs,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
    },
    section: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        borderWidth: 1,
    },
    membersSectionHeader: {
        marginBottom: theme.spacing.sm,
    },
    memberList: {
        marginTop: theme.spacing.sm,
    },
    memberRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    memberMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    memberAvatar: {
        width: 46,
        height: 46,
        borderRadius: theme.radius.lg,
        alignItems: "center",
        justifyContent: "center",
        marginRight: theme.spacing.sm,
    },
    memberName: {
        fontSize: 16,
        fontWeight: "600",
    },
    memberRole: {
        fontSize: 12,
        marginTop: 2,
    },
    memberActions: {
        flexDirection: "row",
    },
    memberActionButton: {
        padding: theme.spacing.sm,
        borderRadius: theme.radius.md,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: theme.spacing.xs,
    },
    sectionHint: {
        fontSize: 14,
        marginBottom: theme.spacing.md,
    },
    editingNotice: {
        fontSize: 12,
        marginBottom: theme.spacing.md,
    },
    input: {
        padding: theme.spacing.md,
        fontSize: 16,
        borderWidth: 1,
        marginBottom: theme.spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.md,
    },
    emojiGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: theme.spacing.md,
    },
    emojiButton: {
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
    },
    emojiText: {
        fontSize: 24,
    },
    colorGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: theme.spacing.lg,
    },
    colorButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "transparent",
    },
    colorButtonSelected: {
        borderWidth: 3,
    },
    preview: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing.md,
        gap: theme.spacing.md,
    },
    previewAvatar: {
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
    },
    previewEmoji: {
        fontSize: 28,
    },
    previewName: {
        fontSize: 18,
        fontWeight: "600",
    },
    completeButton: {
        padding: theme.spacing.lg,
        alignItems: "center",
        marginTop: theme.spacing.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    completeButtonText: {
        fontSize: 18,
        fontWeight: "700",
    },
});
