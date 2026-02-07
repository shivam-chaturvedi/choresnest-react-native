import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { Fingerprint } from 'lucide-react-native';

interface BiometricLockScreenProps {
    isLocked: boolean;
    unlockWithBiometric: () => Promise<boolean>;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
    isLocked,
    unlockWithBiometric,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [error, setError] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        if (isLocked) {
            // Automatically trigger biometric authentication when screen appears
            handleBiometricAuth();
        }
    }, [isLocked]);

    const handleBiometricAuth = async () => {
        setError('');
        setIsAuthenticating(true);
        try {
            const success = await unlockWithBiometric();
            if (!success) {
                setError('Biometric authentication failed. Please try again.');
            }
        } catch (err) {
            setError('Biometric authentication is not available.');
        } finally {
            setIsAuthenticating(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.overlay}
        >
            <View style={[styles.card, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                <View style={[styles.iconContainer, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
                    <Fingerprint size={48} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.foreground }]}>Secure Access</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Use your biometric to unlock
                </Text>
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                {isAuthenticating ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : (
                    <Pressable
                        onPress={handleBiometricAuth}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: pressed ? `${colors.primary}cc` : colors.primary,
                                borderRadius: radius.sm,
                            },
                        ]}
                    >
                        <Text style={{ color: colors.primaryForeground, fontWeight: '600' }}>
                            Try Again
                        </Text>
                    </Pressable>
                )}
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
        padding: 32,
        gap: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
        elevation: 8,
    },
    iconContainer: {
        width: 96,
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    error: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 8,
    },
    loader: {
        marginVertical: 16,
    },
    primaryButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        alignItems: 'center',
        marginTop: 8,
    },
});
