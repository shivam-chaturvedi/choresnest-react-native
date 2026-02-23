import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeColors } from '../../contexts/ThemeContext';
import { AppIcon, isAppIconName } from './AppIcon';

export const predefinedIcons = [
    "account", "face-woman", "face-man-profile", "baby-face-outline",
    "human-child", "human-male", "human-female", "face-man-shimmer",
    "glasses", "head-lightbulb", "ninja", "robot-outline"
];

interface MemberIconProps {
    symbol: string | undefined;
    size?: number;
    color?: string;
    style?: TextStyle | TextStyle[];
}

export const MemberIcon: React.FC<MemberIconProps> = ({ symbol, size = 24, color, style }) => {
    const colors = useThemeColors();
    const finalColor = color || colors.foreground;

    if (!symbol) {
        return <Text style={[{ fontSize: size, color: finalColor }, style]}>👤</Text>;
    }

    // If it looks like a material icon name (lowercase, numbers, hyphens), try rendering it
    if (isAppIconName(symbol)) {
        return <AppIcon name={symbol} size={size} color={finalColor} style={style} />;
    }

    const isIconName = /^[a-z0-9-]+$/.test(symbol);
    if (isIconName) {
        return <MaterialCommunityIcons name={symbol} size={size} color={finalColor} style={style} />;
    }

    return <Text style={[{ fontSize: size, color: finalColor }, style]}>{symbol}</Text>;
};
