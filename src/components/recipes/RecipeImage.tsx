import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { useThemeColors } from '../../contexts/ThemeContext';

interface RecipeImageProps {
    image?: string | null;
    size?: number;
    iconSize?: number;
    emojiSize?: number;
    borderRadius?: number;
    style?: any;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({
    image,
    size = 44,
    iconSize,
    emojiSize,
    borderRadius = 8,
    style
}) => {
    const colors = useThemeColors();

    const normalizedImage = typeof image === 'string' ? image.trim() : '';
    if (!normalizedImage) {
        return null;
    }

    // Default Icon/Emoji sizes if not provided
    const finalIconSize = iconSize || Math.floor(size * 0.55);
    const finalEmojiSize = emojiSize || Math.floor(size * 0.65);

    if (normalizedImage === "AUDIO_ICON" || normalizedImage === "mic") {
        return (
            <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
                <AppIcon name="mic" size={finalIconSize} color={colors.primary} />
            </View>
        );
    }

    if (normalizedImage === "LINK_ICON" || normalizedImage === "link") {
        return (
            <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
                <AppIcon name="link" size={finalIconSize} color={colors.primary} />
            </View>
        );
    }

    if (
        normalizedImage.startsWith('http') ||
        normalizedImage.startsWith('file:') ||
        normalizedImage.startsWith('content:')
    ) {
        return (
            <Image
                source={{ uri: normalizedImage }}
                style={[{ width: size, height: size, borderRadius }, style]}
                resizeMode="cover"
            />
        );
    }

    // Render string (emoji/text) if provided
    return (
        <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
            <Text style={{ fontSize: finalEmojiSize }}>{normalizedImage}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    }
});
