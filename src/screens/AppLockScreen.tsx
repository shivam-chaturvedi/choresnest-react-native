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
    isBiometricEnabled: boolean;
    isBiometricAvailable: boolean;
    biometryType: string | null;
    unlockWithPin: (pin: string) => Promise<boolean>;
    unlockWithBiometrics: () => Promise<boolean>;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({
    isLocked,
    isBiometricEnabled,
    isBiometricAvailable,
    biometryType,
    unlockWithPin,
    unlockWithBiometrics,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [biometricTriggered, setBiometricTriggered] = useState(false);
    const [isBiometricBusy, setIsBiometricBusy] = useState(false);

    // Optimized: Trigger logic extracted to function
    const triggerBiometric = useCallback(async () => {
        setIsBiometricBusy(true);
        const success = await unlockWithBiometrics();
        if (!success) {
            setError('Biometric verification failed. Please use your PIN.');
        }
        setIsBiometricBusy(false);
    }, [unlockWithBiometrics]);

    // On Mount/Update: Immediate check
    useEffect(() => {
        if (isLocked && isBiometricEnabled && isBiometricAvailable && !biometricTriggered) {
            setBiometricTriggered(true);
            // Small delay to ensure UI is ready, but fast enough to feel "instant"
            setTimeout(triggerBiometric, 100);
        }
    }, [isLocked, isBiometricEnabled, isBiometricAvailable, biometricTriggered, triggerBiometric]);


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
                    {isBiometricEnabled && isBiometricAvailable
                        ? `Use ${biometryType ?? 'biometric'} or enter your PIN`
                        : 'Enter your PIN to continue'}
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
                {isBiometricEnabled && isBiometricAvailable ? (
                    <Pressable
                        onPress={triggerBiometric}
                        disabled={isBiometricBusy}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                                borderColor: colors.border,
                                borderRadius: radius.sm,
                                opacity: isBiometricBusy ? 0.6 : pressed ? 0.8 : 1,
                            },
                        ]}
                    >
                        <Text style={{ color: colors.foreground }}>
                            {isBiometricBusy ? 'Checking…' : `Use ${biometryType ?? 'biometric'}`}
                        </Text>
                    </Pressable>
                ) : null}
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
