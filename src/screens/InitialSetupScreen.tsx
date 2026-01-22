import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ScrollView,
    Alert,
} from "react-native";
import { theme } from "../theme";
import { useThemeColors } from "../contexts/ThemeContext";
import { useFamily } from "../contexts/FamilyContext";
import { PROFILE_COLORS } from "../constants/profileColors";
import { AppIcon } from "../components/ui/AppIcon";

interface InitialSetupScreenProps {
    onComplete: () => void;
}

export const InitialSetupScreen: React.FC<InitialSetupScreenProps> = ({ onComplete }) => {
    const colors = useThemeColors();
    const radius = theme.radius;
    const { setFamilyName, addMember, setActiveMember, members } = useFamily();

    const [familyNameInput, setFamilyNameInput] = useState("");
    const [memberName, setMemberName] = useState("");
    const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
    const [selectedEmoji, setSelectedEmoji] = useState("👤");

    const emojis = ["👤", "👨", "👩", "👦", "👧", "🧑", "👶", "👴", "👵", "🧔", "👨‍🦱", "👩‍🦱"];

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

            // Set family name
            await setFamilyName(familyNameInput.trim());

            // Add first member (main user)
            await addMember({
                name: memberName.trim(),
                symbol: selectedEmoji,
                color: selectedColor.value,
                isActive: true, // Set as active by default
            });

            // Wait a bit for the member to be created
            setTimeout(async () => {
                // Get the newly created member and set as active
                const newMembers = members;
                if (newMembers && newMembers.length > 0) {
                    const firstMember = newMembers[0];
                    await setActiveMember(firstMember);
                }

                // Complete setup
                onComplete();
            }, 500);

        } catch (error) {
            console.error("Error completing setup:", error);
            Alert.alert("Error", "Failed to complete setup. Please try again.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
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
                        onChangeText={setFamilyNameInput}
                        autoCapitalize="words"
                    />
                </View>

                {/* Member Profile Section */}
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                        Your Profile
                    </Text>
                    <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                        This will be your main profile
                    </Text>

                    {/* Name Input */}
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border, borderRadius: radius.md }]}
                        placeholder="Your name"
                        placeholderTextColor={colors.mutedForeground}
                        value={memberName}
                        onChangeText={setMemberName}
                        autoCapitalize="words"
                    />

                    {/* Emoji Selection */}
                    <Text style={[styles.label, { color: colors.foreground }]}>
                        Choose Icon
                    </Text>
                    <View style={styles.emojiGrid}>
                        {emojis.map((emoji) => (
                            <Pressable
                                key={emoji}
                                style={[
                                    styles.emojiButton,
                                    { backgroundColor: selectedEmoji === emoji ? colors.primary + '20' : colors.muted, borderColor: selectedEmoji === emoji ? colors.primary : colors.border, borderRadius: radius.md }
                                ]}
                                onPress={() => setSelectedEmoji(emoji)}
                            >
                                <Text style={styles.emojiText}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Color Selection */}
                    <Text style={[styles.label, { color: colors.foreground }]}>
                        Choose Color
                    </Text>
                    <View style={styles.colorGrid}>
                        {PROFILE_COLORS.map((color) => (
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
                            <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
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
    sectionLabel: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: theme.spacing.xs,
    },
    sectionHint: {
        fontSize: 14,
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
