import React, { useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    Platform,
} from "react-native";
import { useFamily } from "../../contexts/FamilyContext";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { PROFILE_COLORS } from "../../constants/profileColors";

const avatarOptions = ["👤", "👩", "👨", "👶", "👧", "👦", "🧒", "👴", "👵", "🧑", "👱", "🧔", "👩‍🦰", "👨‍🦱", "🧑‍🦳", "👩‍🦲"];

const permissionOptions = [
    { id: "calendar", label: "Calendar", icon: "calendar" as const, description: "View and add events" },
    { id: "grocery", label: "Grocery List", icon: "shoppingCart" as const, description: "Add and check items" },
    { id: "mealplan", label: "Meal Planning", icon: "utensils" as const, description: "Plan and view meals" },
    { id: "vault", label: "Document Vault", icon: "file" as const, description: "Access family documents" },
    { id: "notifications", label: "Notifications", icon: "bell" as const, description: "Receive alerts" },
];

interface FamilyOnboardingProps {
    open: boolean;
    onClose: () => void;
}

interface NewMember {
    name: string;
    avatar: string;
    color: string;
    role: string;
    permissions: Record<string, boolean>;
}

const getDefaultPermissions = (role: string) => {
    switch (role) {
        case "admin":
        case "parent":
            return { calendar: true, grocery: true, mealplan: true, vault: true, notifications: true };
        case "child":
            return { calendar: true, grocery: true, mealplan: false, vault: false, notifications: true };
        default:
            return { calendar: true, grocery: true, mealplan: true, vault: false, notifications: true };
    }
};

export const FamilyOnboarding: React.FC<FamilyOnboardingProps> = ({ open, onClose }) => {
    const { addMember, setFamilyName, familyName } = useFamily();
    const colors = useThemeColors();
    const radius = useThemeRadius();

    // Dynamic roles based on theme
    const roleOptions = [
        { id: "admin", label: "Admin", icon: "crown", description: "Full access to all features", color: colors.warning },
        { id: "parent", label: "Parent", icon: "shield", description: "Can manage family settings", color: colors.primary },
        { id: "child", label: "Child", icon: "eye", description: "View and add items only", color: colors.success },
    ];

    const [step, setStep] = useState(1);
    const [newFamilyName, setNewFamilyName] = useState(familyName || "");
    const [newMembers, setNewMembers] = useState<NewMember[]>([]);
    const [currentMember, setCurrentMember] = useState<NewMember>({
        name: "",
        avatar: "👤",
        color: PROFILE_COLORS[0].value,
        role: "parent",
        permissions: getDefaultPermissions("parent"),
    });

    const handleAddMember = () => {
        if (!currentMember.name.trim()) return;
        setNewMembers([...newMembers, currentMember]);
        setCurrentMember({
            name: "",
            avatar: "👤",
            color: PROFILE_COLORS[(newMembers.length + 1) % PROFILE_COLORS.length].value,
            role: "parent",
            permissions: getDefaultPermissions("parent"),
        });
    };


    const handleComplete = () => {
        if (newFamilyName.trim()) {
            setFamilyName(newFamilyName);
        }
        newMembers.forEach(m => addMember({
            name: m.name,
            symbol: m.avatar,
            color: m.color,
        }));
        onClose();
        setStep(1);
        setNewMembers([]);
    };

    const getPermissionCount = (perms: Record<string, boolean>) => Object.values(perms).filter(Boolean).length;

    return (
        <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <AppIcon name="users" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[styles.title, { color: colors.foreground }]}>Family Setup</Text>
                    </View>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Step {step} of 3</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBar}>
                    {[1, 2, 3].map((s) => (
                        <View
                            key={s}
                            style={[
                                styles.progressSegment,
                                { backgroundColor: s <= step ? colors.primary : colors.muted },
                            ]}
                        />
                    ))}
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {step === 1 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.muted }]}>
                                <AppIcon name="users" size={40} color={colors.primary} />
                            </View>
                            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Name Your Family</Text>
                            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>This will be displayed at the top of your home screen</Text>

                            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Family Name</Text>
                            <TextInput
                                value={newFamilyName}
                                onChangeText={setNewFamilyName}
                                placeholder="e.g., The Smiths"
                                placeholderTextColor={colors.mutedForeground}
                                style={[styles.bigInput, {
                                    backgroundColor: colors.card,
                                    borderColor: colors.border,
                                    color: colors.foreground,
                                    borderRadius: radius.md
                                }]}
                            />

                            <Pressable
                                style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: radius.md }, !newFamilyName.trim() && styles.disabledButton]}
                                onPress={() => setStep(2)}
                                disabled={!newFamilyName.trim()}
                            >
                                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Continue</Text>
                                <AppIcon name="arrowRight" size={16} color={colors.primaryForeground} style={{ marginLeft: 8 }} />
                            </Pressable>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.stepContainer}>
                            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Add Family Members</Text>
                            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>Add everyone in your household</Text>

                            {newMembers.map((member, index) => (
                                <View key={index} style={[styles.memberItem, { backgroundColor: colors.muted }]}>
                                    <View style={[styles.memberAvatarSmall, { backgroundColor: PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.muted }]}>
                                        <Text style={{ fontSize: 20 }}>{member.avatar}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                                        <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{member.role} • {getPermissionCount(member.permissions)} permissions</Text>
                                    </View>
                                    <Pressable onPress={() => setNewMembers(newMembers.filter((_, i) => i !== index))}>
                                        <Text style={{ fontSize: 18, color: colors.mutedForeground }}>✕</Text>
                                    </Pressable>
                                </View>
                            ))}

                            <View style={[styles.addMemberForm, {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                borderRadius: radius.card
                            }]}>
                                <TextInput
                                    value={currentMember.name}
                                    onChangeText={(text) => setCurrentMember({ ...currentMember, name: text })}
                                    placeholder="Member name"
                                    placeholderTextColor={colors.mutedForeground}
                                    style={[styles.input, {
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                        color: colors.foreground,
                                        borderRadius: radius.sm
                                    }]}
                                />

                                <Text style={[styles.label, { color: colors.mutedForeground }]}>Avatar</Text>
                                <View style={styles.grid}>
                                    {avatarOptions.map(avatar => (
                                        <Pressable
                                            key={avatar}
                                            onPress={() => setCurrentMember({ ...currentMember, avatar })}
                                            style={[
                                                styles.avatarOption,
                                                { backgroundColor: colors.muted, borderRadius: radius.xs },
                                                currentMember.avatar === avatar && {
                                                    backgroundColor: colors.primary,
                                                    borderColor: colors.primary,
                                                    borderWidth: 2
                                                }
                                            ]}
                                        >
                                            <Text style={{ fontSize: 20 }}>{avatar}</Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={[styles.label, { color: colors.mutedForeground }]}>Role</Text>
                                {roleOptions.map(role => (
                                    <Pressable
                                        key={role.id}
                                        onPress={() => setCurrentMember({ ...currentMember, role: role.id, permissions: getDefaultPermissions(role.id) })}
                                        style={[
                                            styles.roleOption,
                                            { backgroundColor: colors.muted, borderRadius: radius.sm },
                                            currentMember.role === role.id && {
                                                backgroundColor: colors.primary + "1A",
                                                borderColor: colors.primary,
                                                borderWidth: 1
                                            }
                                        ]}
                                    >
                                        <AppIcon name={role.icon as any} size={20} color={role.color} />
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={[styles.roleLabel, { color: colors.foreground }]}>{role.label}</Text>
                                            <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{role.description}</Text>
                                        </View>
                                    </Pressable>
                                ))}

                                <Pressable style={[styles.outlineButton, { borderColor: colors.border, borderRadius: radius.sm }]} onPress={handleAddMember}>
                                    <Text style={[styles.outlineButtonText, { color: colors.foreground }]}>Add Member</Text>
                                </Pressable>
                            </View>

                            <View style={styles.row}>
                                <Pressable style={[styles.outlineButton, { flex: 1, borderColor: colors.border, borderRadius: radius.md }]} onPress={() => setStep(1)}>
                                    <Text style={[styles.outlineButtonText, { color: colors.foreground }]}>Back</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.primaryButton, { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md }, newMembers.length === 0 && styles.disabledButton]}
                                    onPress={() => setStep(3)}
                                    disabled={newMembers.length === 0}
                                >
                                    <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Review</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.stepContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.success + "20" }]}>
                                <AppIcon name="checkSquare" size={40} color={colors.success} />
                            </View>
                            <Text style={[styles.stepTitle, { color: colors.foreground }]}>Review Your Family</Text>
                            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>Everything looks good? Let's get started!</Text>

                            <View style={[styles.reviewCard, { backgroundColor: colors.card, borderRadius: radius.card, width: '100%', padding: 16, marginBottom: 32 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                    <AppIcon name="users" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                    <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{newFamilyName}</Text>
                                </View>
                                {newMembers.map((member, index) => (
                                    <View key={index} style={[styles.memberItem, { backgroundColor: colors.muted }]}>
                                        <View style={[styles.memberAvatarSmall, { backgroundColor: PROFILE_COLORS.find(c => c.value === member.color)?.hex || colors.muted }]}>
                                            <Text style={{ fontSize: 16 }}>{member.avatar}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.memberName, { color: colors.foreground }]}>{member.name}</Text>
                                            <Text style={[styles.memberRole, { color: colors.mutedForeground }]}>{member.role}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary, borderRadius: radius.md }]} onPress={handleComplete}>
                                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Complete Setup</Text>
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    header: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
    },
    progressBar: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 4,
        marginBottom: 24,
    },
    progressSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    stepContainer: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    stepDesc: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
    },
    inputLabel: {
        alignSelf: 'flex-start',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    bigInput: {
        width: '100%',
        height: 56,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 32,
    },
    primaryButton: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    memberItem: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    memberAvatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    memberName: {
        fontWeight: '600',
    },
    memberRole: {
        fontSize: 12,
    },
    addMemberForm: {
        width: '100%',
        padding: 16,
        borderWidth: 1,
        marginBottom: 24,
        marginTop: 16,
    },
    input: {
        height: 44,
        borderWidth: 1,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    avatarOption: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
    },
    roleLabel: {
        fontWeight: '600',
    },
    roleDesc: {
        fontSize: 12,
    },
    outlineButton: {
        width: '100%',
        height: 44,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    outlineButtonText: {
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    reviewCard: {
        width: '100%',
        padding: 16,
        marginTop: 24,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    }
});
