import React, { useEffect, useRef, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    TouchableWithoutFeedback,
    Dimensions
} from "react-native";
import { theme } from "../../theme";
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
    const [renderModal, setRenderModal] = useState(open);

    // Animation Values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const translateYAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
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
            ]).start(() => setRenderModal(false));
        }
    }, [open]);

    if (!renderModal) return null;

    const handleAddNote = () => {
        onClose();
        navigation.navigate("NoteDetail");
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
            color: "#3B82F6",
            bg: "#EBF5FF",
            action: () => { onClose(); onAddEvent(); }
        },
        {
            id: "task",
            label: "Add Task",
            icon: "checkSquare",
            color: "#22C55E",
            bg: "#DCFCE7",
            action: () => { onClose(); onAddTask(); }
        },
        {
            id: "note",
            label: "Add Note",
            icon: "fileText",
            color: "#F59E0B",
            bg: "#FEF3C7",
            action: handleAddNote
        },
        {
            id: "document",
            label: "Add Document",
            icon: "file",
            color: "#06B6D4",
            bg: "#CFFAFE",
            action: handleAddDocument
        }
    ];

    return (
        <Modal visible={renderModal} transparent animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <Animated.View
                            style={[
                                styles.card,
                                {
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
                                    >
                                        <View style={[styles.iconCircle, { backgroundColor: opt.bg }]}>
                                            <AppIcon name={opt.icon as AppIconName} size={24} color={opt.color} />
                                        </View>
                                        <Text style={styles.optionLabel}>{opt.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.3)", // Lighter dim
    },
    card: {
        position: 'absolute',
        bottom: 140, // Positioned higher above the FAB (which is at bottom: 20)
        right: 24,
        width: 200,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
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
        color: theme.colors.foreground,
    }
});
