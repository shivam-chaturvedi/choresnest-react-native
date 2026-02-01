import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';

interface AppLockScreenProps {
    isLocked: boolean;
    unlockWithPin: (pin: string) => Promise<boolean>;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
    isLocked,
    unlockWithPin,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        if (pin.length !== 4) {
            setError('Enter a 4-digit PIN');
            return;
        }
        const success = await unlockWithPin(pin);
        if (!success) {
            setError('PIN did not match');
        } else {
            setPin('');
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.overlay}
        >
            <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                <Text style={[styles.title, { color: colors.foreground }]}>Secure Access</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Enter your PIN to continue
                </Text>
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                    value={pin}
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry
                    placeholder="••••"
                    placeholderTextColor={colors.mutedForeground}
                    onChangeText={value => setPin(value.replace(/[^0-9]/g, ''))}
                />
                <Pressable
                    onPress={handleSubmit}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        {
                            backgroundColor: pressed ? `${colors.primary}cc` : colors.primary,
                            borderRadius: radius.sm,
                        },
                    ]}
                >
                    <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>Unlock</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        padding: 24,
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    error: {
        fontSize: 13,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        fontSize: 24,
        letterSpacing: 12,
        textAlign: 'center',
    },
    primaryButton: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButton: {
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
});
