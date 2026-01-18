import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { AppIcon } from '../ui/AppIcon';
import { useThemeColors } from '../../contexts/ThemeContext';

interface RecipeImageProps {
    image: string;
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

    // Default Icon/Emoji sizes if not provided
    const finalIconSize = iconSize || Math.floor(size * 0.55);
    const finalEmojiSize = emojiSize || Math.floor(size * 0.65);

    if (image === "AUDIO_ICON" || image === "mic") {
        return (
            <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
                <AppIcon name="mic" size={finalIconSize} color={colors.primary} />
            </View>
        );
    }

    if (image === "LINK_ICON" || image === "link") {
        return (
            <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
                <AppIcon name="link" size={finalIconSize} color={colors.primary} />
            </View>
        );
    }

    if (image.startsWith('http') || image.startsWith('file:') || image.startsWith('content:')) {
        return (
            <Image
                source={{ uri: image }}
                style={[{ width: size, height: size, borderRadius }, style]}
                resizeMode="cover"
            />
        );
    }

    // Fallback to Emoji
    return (
        <View style={[styles.container, { width: size, height: size, borderRadius, backgroundColor: colors.muted }, style]}>
            <Text style={{ fontSize: finalEmojiSize }}>{image}</Text>
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
