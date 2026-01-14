
import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Modal,
    ScrollView,
    TextInput,
    Alert,
} from "react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { AppIcon } from "../ui/AppIcon";

interface Kid {
    id: string;
    name: string;
    avatar: string;
    totalStars: number;
    weeklyStars: number;
}

interface Chore {
    id: string;
    name: string;
    icon: string;
    stars: number;
    assignedTo: string;
    completed: boolean;
    frequency: "daily" | "weekly";
}

interface Reward {
    id: string;
    name: string;
    icon: string;
    starsRequired: number;
    claimed: boolean;
}

const initialKids: Kid[] = [
    { id: "1", name: "Emma", avatar: "👧", totalStars: 45, weeklyStars: 12 },
    { id: "2", name: "Jake", avatar: "👦", totalStars: 38, weeklyStars: 8 },
];

const initialChores: Chore[] = [
    { id: "1", name: "Make bed", icon: "🛏️", stars: 1, assignedTo: "1", completed: true, frequency: "daily" },
    { id: "2", name: "Feed the dog", icon: "🐕", stars: 2, assignedTo: "2", completed: false, frequency: "daily" },
    { id: "3", name: "Wash dishes", icon: "🍽️", stars: 2, assignedTo: "1", completed: false, frequency: "daily" },
    { id: "4", name: "Sweep floor", icon: "🧹", stars: 2, assignedTo: "2", completed: true, frequency: "daily" },
    { id: "5", name: "Take out trash", icon: "🗑️", stars: 1, assignedTo: "1", completed: false, frequency: "weekly" },
    { id: "6", name: "Clean room", icon: "🧹", stars: 3, assignedTo: "2", completed: false, frequency: "weekly" },
    { id: "7", name: "Water plants", icon: "🌱", stars: 1, assignedTo: "1", completed: false, frequency: "weekly" },
];

const initialRewards: Reward[] = [
    { id: "1", name: "Extra game time (30 min)", icon: "🎮", starsRequired: 10, claimed: false },
    { id: "2", name: "Movie night pick", icon: "🎬", starsRequired: 15, claimed: false },
    { id: "3", name: "Ice cream treat", icon: "🍦", starsRequired: 20, claimed: false },
    { id: "4", name: "Stay up late (1 hour)", icon: "🌙", starsRequired: 25, claimed: false },
    { id: "5", name: "Small toy/game", icon: "🎁", starsRequired: 50, claimed: false },
];

export const ChoreRotationSystem: React.FC = () => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [kids, setKids] = useState<Kid[]>(initialKids);
    const [chores, setChores] = useState<Chore[]>(initialChores);
    const [rewards, setRewards] = useState<Reward[]>(initialRewards);
    const [selectedKid, setSelectedKid] = useState<Kid | null>(null);
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showAddChoreModal, setShowAddChoreModal] = useState(false);
    const [newChore, setNewChore] = useState({ name: "", stars: 1, icon: "✨" });

    const toggleChoreComplete = (choreId: string) => {
        setChores((prev) =>
            prev.map((chore) => {
                if (chore.id === choreId) {
                    const newCompleted = !chore.completed;
                    if (newCompleted) {
                        // Award stars
                        setKids((prevKids) =>
                            prevKids.map((kid) => {
                                if (kid.id === chore.assignedTo) {
                                    Alert.alert(
                                        `⭐ ${chore.stars} star${chore.stars > 1 ? "s" : ""} earned!`,
                                        `${kid.name} completed ${chore.name}`
                                    );
                                    return {
                                        ...kid,
                                        totalStars: kid.totalStars + chore.stars,
                                        weeklyStars: kid.weeklyStars + chore.stars,
                                    };
                                }
                                return kid;
                            })
                        );
                    }
                    return { ...chore, completed: newCompleted };
                }
                return chore;
            })
        );
    };

    const rotateChores = () => {
        setChores((prev) =>
            prev.map((chore) => ({
                ...chore,
                assignedTo: chore.assignedTo === "1" ? "2" : "1",
                completed: false,
            }))
        );
        Alert.alert("Chores rotated!", "Assignments have been swapped between kids");
    };

    const claimReward = (reward: Reward, kid: Kid) => {
        if (kid.totalStars >= reward.starsRequired) {
            setKids((prev) =>
                prev.map((k) =>
                    k.id === kid.id
                        ? { ...k, totalStars: k.totalStars - reward.starsRequired }
                        : k
                )
            );
            Alert.alert("🎉 Reward Claimed!", `${kid.name} redeemed: ${reward.name}`);
            setShowRewardModal(false);
            setSelectedKid(null);
        }
    };

    const addNewChore = () => {
        if (!newChore.name) return;
        const chore: Chore = {
            id: Date.now().toString(),
            name: newChore.name,
            icon: newChore.icon,
            stars: newChore.stars,
            assignedTo: "1",
            completed: false,
            frequency: "daily",
        };
        setChores((prev) => [...prev, chore]);
        setNewChore({ name: "", stars: 1, icon: "✨" });
        setShowAddChoreModal(false);
    };

    const getKidById = (id: string) => kids.find((k) => k.id === id);

    return (
        <View style={styles.container}>
            {/* Kids Progress Cards */}
            <View style={styles.kidsSection}>
                {kids.map((kid) => {
                    const kidChores = chores.filter((c) => c.assignedTo === kid.id);
                    const completedChores = kidChores.filter((c) => c.completed).length;
                    const progressPercent = kidChores.length > 0 ? (completedChores / kidChores.length) * 100 : 0;
                    const nextReward = rewards.find((r) => r.starsRequired > kid.totalStars) || rewards[rewards.length - 1];
                    const starsToNextReward = nextReward ? nextReward.starsRequired - kid.totalStars : 0;

                    return (
                        <View key={kid.id} style={[styles.kidCard, { backgroundColor: colors.card, borderRadius: radius.lg }]}>
                            <View style={styles.kidHeader}>
                                <View style={styles.avatarContainer}>
                                    <Text style={{ fontSize: 24 }}>{kid.avatar}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.kidName, { color: colors.foreground }]}>{kid.name}</Text>
                                    <View style={styles.starsRow}>
                                        <AppIcon name="star" size={14} color={colors.warning} />
                                        <Text style={[styles.starsText, { color: colors.foreground }]}>{kid.totalStars}</Text>
                                        <Text style={[styles.starsLabel, { color: colors.mutedForeground }]}>total stars</Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={[styles.rewardsButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                                    onPress={() => {
                                        setSelectedKid(kid);
                                        setShowRewardModal(true);
                                    }}
                                >
                                    <AppIcon name="gift" size={16} color={colors.foreground} />
                                    <Text style={[styles.rewardsButtonText, { color: colors.foreground }]}>Rewards</Text>
                                </Pressable>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressSection}>
                                <View style={styles.progressMeta}>
                                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>Today's Progress</Text>
                                    <Text style={[styles.progressValue, { color: colors.foreground }]}>{completedChores}/{kidChores.length}</Text>
                                </View>
                                <View style={[styles.progressBarBg, { backgroundColor: colors.muted }]}>
                                    <View
                                        style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: colors.success }]}
                                    />
                                </View>
                            </View>

                            {/* Next reward progress */}
                            {nextReward && starsToNextReward > 0 && (
                                <View style={[styles.nextRewardCard, { borderRadius: radius.md }]}>
                                    <View style={styles.nextRewardHeader}>
                                        <Text style={{ fontSize: 16 }}>{nextReward.icon}</Text>
                                        <Text style={[styles.nextRewardText, { color: colors.foreground }]}>
                                            {starsToNextReward} more stars for: {nextReward.name}
                                        </Text>
                                    </View>
                                    <View style={styles.rewardProgressBarBg}>
                                        <View
                                            style={[
                                                styles.rewardProgressBarFill,
                                                { width: `${(kid.totalStars / nextReward.starsRequired) * 100}%`, backgroundColor: colors.warning },
                                            ]}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Rotate Button */}
            <Pressable style={[styles.rotateButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg }]} onPress={rotateChores}>
                <AppIcon name="repeat" size={16} color={colors.foreground} style={{ marginRight: 8 }} />
                <Text style={[styles.rotateButtonText, { color: colors.foreground }]}>Rotate Chores Between Kids</Text>
            </Pressable>

            {/* Daily Chores List */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Chores</Text>
                <Pressable onPress={() => setShowAddChoreModal(true)} style={styles.addButton}>
                    <AppIcon name="plus" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.addButtonText, { color: colors.foreground }]}>Add</Text>
                </Pressable>
            </View>

            <View style={styles.choresList}>
                {chores
                    .filter((c) => c.frequency === "daily")
                    .map((chore) => {
                        const kid = getKidById(chore.assignedTo);
                        return (
                            <View key={chore.id} style={[styles.choreCard, { backgroundColor: colors.card, borderRadius: radius.md }, chore.completed && styles.choreCompleted]}>
                                <Pressable
                                    onPress={() => toggleChoreComplete(chore.id)}
                                    style={[styles.checkCircle, { borderColor: colors.border, borderRadius: radius.xs }, chore.completed && { backgroundColor: colors.success, borderColor: colors.success }]}
                                >
                                    {chore.completed && <AppIcon name="check" size={12} color="#fff" />}
                                </Pressable>

                                <Text style={styles.choreIcon}>{chore.icon}</Text>

                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.choreName, { color: colors.foreground }, chore.completed && styles.choreNameCompleted]}>
                                        {chore.name}
                                    </Text>
                                    <View style={styles.choreMeta}>
                                        <Text style={[styles.choreAssignee, { color: colors.mutedForeground }]}>{kid?.avatar} {kid?.name}</Text>
                                        <View style={styles.choreStars}>
                                            {Array.from({ length: chore.stars }).map((_, i) => (
                                                <Text key={i} style={{ fontSize: 10 }}>⭐</Text>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
            </View>

            {/* Weekly Chores List */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Chores</Text>
            </View>
            <View style={styles.choresList}>
                {chores
                    .filter((c) => c.frequency === "weekly")
                    .map((chore) => {
                        const kid = getKidById(chore.assignedTo);
                        return (
                            <View key={chore.id} style={[styles.choreCard, { backgroundColor: colors.card, borderRadius: radius.md }, chore.completed && styles.choreCompleted]}>
                                <Pressable
                                    onPress={() => toggleChoreComplete(chore.id)}
                                    style={[styles.checkCircle, { borderColor: colors.border, borderRadius: radius.xs }, chore.completed && { backgroundColor: colors.success, borderColor: colors.success }]}
                                >
                                    {chore.completed && <AppIcon name="check" size={12} color="#fff" />}
                                </Pressable>

                                <Text style={styles.choreIcon}>{chore.icon}</Text>

                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.choreName, { color: colors.foreground }, chore.completed && styles.choreNameCompleted]}>
                                        {chore.name}
                                    </Text>
                                    <View style={styles.choreMeta}>
                                        <Text style={[styles.choreAssignee, { color: colors.mutedForeground }]}>{kid?.avatar} {kid?.name}</Text>
                                        <View style={styles.choreStars}>
                                            {Array.from({ length: chore.stars }).map((_, i) => (
                                                <Text key={i} style={{ fontSize: 10 }}>⭐</Text>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
            </View>

            {/* Rewards Modal */}
            <Modal visible={showRewardModal} transparent animationType="fade" onRequestClose={() => setShowRewardModal(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
                        <View style={styles.modalHeader}>
                            <AppIcon name="gift" size={24} color={colors.primary} />
                            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{selectedKid?.name}'s Rewards</Text>
                            <Pressable onPress={() => setShowRewardModal(false)} style={styles.closeButton}>
                                <AppIcon name="x" size={24} color={colors.mutedForeground} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {selectedKid && (
                                <View style={{ gap: 16 }}>
                                    <View style={[styles.starsCard, { borderRadius: radius.lg }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <AppIcon name="star" size={24} color={colors.warning} />
                                            <Text style={[styles.starsCardValue, { color: colors.foreground }]}>{selectedKid.totalStars}</Text>
                                        </View>
                                        <Text style={[styles.starsCardLabel, { color: colors.mutedForeground }]}>Available Stars</Text>
                                    </View>

                                    <View style={styles.rewardsList}>
                                        {rewards.map((reward) => {
                                            const canClaim = selectedKid.totalStars >= reward.starsRequired;
                                            return (
                                                <View key={reward.id} style={[styles.rewardItem, { backgroundColor: colors.background, borderColor: "transparent", borderRadius: radius.md }, canClaim && { borderColor: colors.success, backgroundColor: colors.success + '0D' }]}>
                                                    <Text style={{ fontSize: 32 }}>{reward.icon}</Text>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.rewardName, { color: colors.foreground }]}>{reward.name}</Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            <AppIcon name="star" size={12} color={colors.warning} />
                                                            <Text style={[styles.rewardCost, { color: colors.mutedForeground }]}>{reward.starsRequired} stars</Text>
                                                        </View>
                                                    </View>
                                                    <Pressable
                                                        onPress={() => claimReward(reward, selectedKid)}
                                                        disabled={!canClaim}
                                                        style={[styles.claimButton, { backgroundColor: colors.primary, borderRadius: radius.md }, !canClaim && { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }]}
                                                    >
                                                        <Text style={[styles.claimButtonText, !canClaim && { color: colors.foreground }]}>
                                                            {canClaim ? 'Claim' : `${reward.starsRequired - selectedKid.totalStars} more`}
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Chore Modal */}
            <Modal visible={showAddChoreModal} transparent animationType="fade" onRequestClose={() => setShowAddChoreModal(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                    <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
                        <View style={styles.modalHeader}>
                            <AppIcon name="plus" size={24} color={colors.primary} />
                            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add New Chore</Text>
                            <Pressable onPress={() => setShowAddChoreModal(false)} style={styles.closeButton}>
                                <AppIcon name="x" size={24} color={colors.mutedForeground} />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Chore Name</Text>
                                <TextInput
                                    value={newChore.name}
                                    onChangeText={(text) => setNewChore(prev => ({ ...prev, name: text }))}
                                    placeholder="e.g., Clean room"
                                    placeholderTextColor={colors.mutedForeground}
                                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderRadius: radius.md }]}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Stars Reward</Text>
                                <View style={styles.starsSelector}>
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <Pressable
                                            key={num}
                                            onPress={() => setNewChore(prev => ({ ...prev, stars: num }))}
                                            style={[
                                                styles.starOption,
                                                { borderColor: colors.border, borderRadius: radius.md },
                                                newChore.stars === num && { borderColor: colors.warning, backgroundColor: colors.warning + "26" }
                                            ]}
                                        >
                                            <Text style={{ fontSize: 16 }}>{Array(num).fill('⭐').join('')}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Icon</Text>
                                <View style={styles.iconSelector}>
                                    {['🧹', '🍽️', '🛏️', '🐕', '🗑️', '🌱', '📚', '🧺', '🚿', '🪥'].map((icon) => (
                                        <Pressable
                                            key={icon}
                                            onPress={() => setNewChore(prev => ({ ...prev, icon }))}
                                            style={[
                                                styles.iconOption,
                                                { borderColor: colors.border, borderRadius: radius.md },
                                                newChore.icon === icon && { borderColor: colors.primary, backgroundColor: colors.primary + "1A" }
                                            ]}
                                        >
                                            <Text style={{ fontSize: 20 }}>{icon}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <Pressable
                                style={[styles.saveButton, { backgroundColor: colors.primary, borderRadius: radius.md }, !newChore.name && { opacity: 0.5 }]}
                                onPress={addNewChore}
                                disabled={!newChore.name}
                            >
                                <Text style={styles.saveButtonText}>Add Chore</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    kidsSection: {
        gap: 12,
    },
    kidCard: {
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    kidHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: "rgba(245, 166, 35, 0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    kidName: {
        fontSize: 18,
        fontWeight: "700",
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    starsText: {
        fontSize: 16,
        fontWeight: "700",
    },
    starsLabel: {
        fontSize: 12,
    },
    rewardsButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
    },
    rewardsButtonText: {
        fontWeight: "600",
        fontSize: 14,
    },
    progressSection: {
        marginBottom: 12,
    },
    progressMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 12,
    },
    progressValue: {
        fontSize: 12,
        fontWeight: "600",
    },
    progressBarBg: {
        height: 8,
        borderRadius: 999,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        borderRadius: 999,
    },
    nextRewardCard: {
        backgroundColor: "rgba(245, 166, 35, 0.15)",
        padding: 12,
    },
    nextRewardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    nextRewardText: {
        fontSize: 12,
        fontWeight: "600",
    },
    rewardProgressBarBg: {
        height: 6,
        backgroundColor: "#fff",
        borderRadius: 999,
        overflow: "hidden",
    },
    rewardProgressBarFill: {
        height: "100%",
        borderRadius: 999,
    },
    rotateButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderWidth: 1,
    },
    rotateButtonText: {
        fontWeight: "600",
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: "500",
    },
    choresList: {
        gap: 8,
    },
    choreCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    choreCompleted: {
        opacity: 0.6,
    },
    checkCircle: {
        width: 32,
        height: 32,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    choreIcon: {
        fontSize: 24,
    },
    choreName: {
        fontSize: 16,
        fontWeight: "600",
    },
    choreNameCompleted: {
        textDecorationLine: "line-through",
    },
    choreMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 2,
    },
    choreAssignee: {
        fontSize: 12,
    },
    choreStars: {
        flexDirection: "row",
        gap: 2,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        padding: 16,
    },
    modalContainer: {
        maxHeight: "80%",
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    modalContent: {
        marginBottom: 20,
    },
    starsCard: {
        backgroundColor: "rgba(245, 166, 35, 0.15)",
        padding: 20,
        alignItems: "center",
        marginBottom: 16,
    },
    starsCardValue: {
        fontSize: 32,
        fontWeight: "700",
    },
    starsCardLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    rewardsList: {
        gap: 12,
    },
    rewardItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        gap: 12,
        borderWidth: 1,
    },
    rewardName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    rewardCost: {
        fontSize: 12,
    },
    claimButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    claimButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 12,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    input: {
        padding: 12,
        fontSize: 16,
    },
    starsSelector: {
        flexDirection: "row",
        gap: 8,
    },
    starOption: {
        flex: 1,
        height: 48,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    iconSelector: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    iconOption: {
        width: 56,
        height: 56,
        borderWidth: 2,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButton: {
        padding: 16,
        alignItems: "center",
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
