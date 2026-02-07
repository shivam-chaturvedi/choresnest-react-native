import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import { SyncService } from '../services/SyncService';
import { ActivityIndicator } from 'react-native';

export const SyncIndicator: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const unsubscribe = SyncService.onSyncStatusChange((syncing) => {
            setIsSyncing(syncing);
            
            // Animate in/out
            Animated.timing(fadeAnim, {
                toValue: syncing ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });

        return unsubscribe;
    }, [fadeAnim]);

    if (!isSyncing) {
        return null;
    }

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.primary,
                    opacity: fadeAnim,
                },
            ]}
        >
            <ActivityIndicator size="small" color={colors.primaryForeground} />
            <Text style={[styles.text, { color: colors.primaryForeground }]}>
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
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
