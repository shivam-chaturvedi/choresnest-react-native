import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ActivityIndicator, Modal } from 'react-native';
import { theme } from '../../theme';

interface LoadingSpinnerProps {
    /** Show as full-screen overlay with backdrop */
    overlay?: boolean;
    /** Size of the spinner */
    size?: 'small' | 'large';
    /** Custom color for the spinner */
    color?: string;
    /** Whether the spinner is visible */
    visible?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    overlay = false,
    size = 'large',
    color = theme.colors.primary,
    visible = true,
}) => {
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            const spinAnimation = Animated.loop(
                Animated.timing(spinValue, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            spinAnimation.start();

            return () => spinAnimation.stop();
        }
    }, [visible, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!visible) return null;

    const spinner = (
        <View style={overlay ? styles.overlayContainer : styles.inlineContainer}>
            <View style={[
                styles.spinnerWrapper,
                overlay && styles.spinnerWrapperOverlay,
                { backgroundColor: overlay ? theme.colors.card : 'transparent' }
            ]}>
                <ActivityIndicator
                    size={size}
                    color={color}
                    style={styles.spinner}
                />
            </View>
        </View>
    );

    if (overlay) {
        return (
            <Modal
                transparent
                visible={visible}
                animationType="fade"
                statusBarTranslucent
            >
                <View style={styles.modalBackdrop}>
                    {spinner}
                </View>
            </Modal>
        );
    }

    return spinner;
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    spinnerWrapper: {
        padding: 24,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    spinnerWrapperOverlay: {
        minWidth: 80,
        minHeight: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spinner: {
        transform: [{ scale: 1.2 }],
    },
});
