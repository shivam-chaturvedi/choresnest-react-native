import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { theme } from '../../theme';
import { AppIcon } from '../ui/AppIcon';

interface SetupProfileModalProps {
    visible: boolean;
    onSubmit: (data: { userName: string; familyName: string }) => void;
    initialFamilyName?: string;
}

export const SetupProfileModal: React.FC<SetupProfileModalProps> = ({ visible, onSubmit, initialFamilyName }) => {
    const [userName, setUserName] = useState('');
    const [familyName, setFamilyName] = useState(initialFamilyName || 'Family Chores');
    const [step, setStep] = useState(1); // 1: Name, 2: Family

    useEffect(() => {
        if (initialFamilyName) {
            setFamilyName(initialFamilyName);
        }
    }, [initialFamilyName]);

    const handleNext = () => {
        if (!userName.trim()) return;
        setStep(2);
    };

    const handleSubmit = () => {
        if (userName.trim() && familyName.trim()) {
            onSubmit({
                userName: userName.trim(),
                familyName: familyName.trim()
            });
            // Reset state after submit
            setTimeout(() => {
                setStep(1);
            }, 500);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <AppIcon name={step === 1 ? "user" : "home"} size={32} color={theme.colors.primary} />
                        </View>
                        <Text style={styles.title}>
                            {step === 1 ? "What's your name?" : "Name your Family"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 1 ? "Help us personalize your experience." : "Create a space for your household."}
                        </Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            {step === 1 ? "Your Name" : "Family Name"}
                        </Text>

                        {step === 1 ? (
                            <TextInput
                                style={styles.input}
                                placeholder="Ex. John Doe"
                                placeholderTextColor={theme.colors.mutedForeground}
                                value={userName}
                                onChangeText={setUserName}
                                autoFocus
                                returnKeyType="next"
                                onSubmitEditing={handleNext}
                            />
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="Ex. The Smiths"
                                placeholderTextColor={theme.colors.mutedForeground}
                                value={familyName}
                                onChangeText={setFamilyName}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, ((step === 1 && !userName.trim()) || (step === 2 && !familyName.trim())) && styles.buttonDisabled]}
                        onPress={step === 1 ? handleNext : handleSubmit}
                        disabled={(step === 1 && !userName.trim()) || (step === 2 && !familyName.trim())}
                    >
                        <Text style={styles.buttonText}>
                            {step === 1 ? "Next" : "Get Started"}
                        </Text>
                        <AppIcon name="arrowRight" size={20} color={theme.colors.primaryForeground} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.lg,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.foreground,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: theme.colors.mutedForeground,
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.foreground,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: theme.colors.foreground,
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.full,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: theme.colors.primaryForeground,
        fontSize: 16,
        fontWeight: '600',
    },
});
