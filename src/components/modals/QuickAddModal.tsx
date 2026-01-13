import React, { useEffect, useRef, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions
} from "react-native";
import { useThemeColors } from "../../contexts/ThemeContext";
import { AppIcon, AppIconName } from "../ui/AppIcon";
import { useNavigation } from "@react-navigation/native";

interface QuickAddModalProps {
    open: boolean;
    onClose: () => void;
    onAddEvent: () => void;
    onAddTask: () => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
    open,
    onClose,
    onAddEvent,
    onAddTask,
}) => {
    const navigation = useNavigation<any>();
    const colors = useThemeColors();
    const [renderModal, setRenderModal] = useState(open);
    const openRef = useRef(open);

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        openRef.current = open;
        if (open) {
            setRenderModal(true);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.spring(translateYAnim, {
                    toValue: 0,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.8,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start(() => {
                if (!openRef.current) {
                    setRenderModal(false);
                }
            });
        }
    }, [open]);

    if (!renderModal) return null;

    const handleAddNote = () => {
        onClose();
        navigation.navigate("Notes");
    };

    const handleAddDocument = () => {
        onClose();
        navigation.navigate("Vault");
    };

    const options = [
        {
            id: "event",
            label: "Add Event",
            icon: "calendar",
            color: colors.foreground,
            bg: colors.secondary,
            action: () => { onClose(); onAddEvent(); }
        },
        {
            id: "task",
            label: "Add Task",
            icon: "checkSquare",
            color: colors.foreground,
            bg: colors.secondary,
            action: () => { onClose(); onAddTask(); }
        },
        {
            id: "note",
            label: "Add Note",
            icon: "edit",
            color: colors.foreground,
            bg: colors.secondary,
            action: handleAddNote
        },
        {
            id: "document",
            label: "Add Document",
            icon: "file",
            color: colors.foreground,
            bg: colors.secondary,
            action: handleAddDocument
        }
    ];

    return (
        <Modal visible={renderModal} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable onPress={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.card,
                                shadowColor: colors.shadow,
                                opacity: fadeAnim,
                                transform: [
                                    { scale: scaleAnim },
                                    { translateY: translateYAnim }
                                ]
                            }
                        ]}
                    >
                        <View style={styles.optionGrid}>
                            {options.map((opt) => (
                                <Pressable
                                    key={opt.id}
                                    style={styles.optionItem}
                                    onPress={opt.action}
                                    android_ripple={{ color: colors.muted }}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: opt.bg }]}>
                                        <AppIcon name={opt.icon as AppIconName} size={24} color={opt.color} />
                                    </View>
                                    <Text style={[styles.optionLabel, { color: colors.foreground }]}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: 'flex-end',
    },
    card: {
        position: 'absolute',
        bottom: 140,
        right: 24,
        width: 200,
        borderRadius: 20,
        padding: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    optionGrid: {
        gap: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    optionLabel: {
        fontSize: 15,
        fontWeight: "600",
    }
});
