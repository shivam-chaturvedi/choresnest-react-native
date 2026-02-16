import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SyncIndicator: React.FC = () => {
    const { isSyncing } = useSyncStatus();
    const { isGuest } = useAuth();
    const colors = useThemeColors();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (isGuest) {
            return;
        }
        Animated.timing(fadeAnim, {
            toValue: isSyncing ? 1 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim, isGuest, isSyncing]);

    if (isGuest) {
        return null;
    }

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                    opacity: fadeAnim,
                    top: insets.top,
                },
            ]}
        >
            <ActivityIndicator size="small" color={colors.primaryForeground} />
            <Text style={[styles.text, { color: '#000000' }]}>
                Syncing...
            </Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        zIndex: 9999,
        gap: 8,
        borderWidth: 1,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
