import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";

interface ImageGalleryModalProps {
    open: boolean;
    onClose: () => void;
    images: string[];
    title?: string;
}

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ open, onClose, images, title }) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { width } = Dimensions.get('window');

    if (!open) return null;

    return (
        <Modal visible={open} animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <AppIcon name="x" size={24} color="#fff" />
                    </TouchableOpacity>
                    {title && <Text style={styles.title}>{title}</Text>}
                </View>

                {/* Gallery */}
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ alignItems: 'center' }}
                >
                    {images.map((img, index) => (
                        <View key={index} style={[styles.imageContainer, { width }]}>
                            {/* In real app, use Image component. For now, referencing local files or dummy */}
                            <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
                                <AppIcon name="image" size={64} color={colors.primary} />
                                <Text style={{ color: colors.foreground, marginTop: 16 }}>{img}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Indicators */}
                <View style={styles.indicatorContainer}>
                    {images.map((_, i) => (
                        <View key={i} style={[styles.dot, { backgroundColor: '#fff', opacity: 0.8 }]} />
                    ))}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    header: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 16,
    },
    imageContainer: {
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        width: '100%',
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 40,
        flexDirection: 'row',
        gap: 8,
        alignSelf: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    }
});
