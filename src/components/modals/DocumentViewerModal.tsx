import React from 'react';
import { View, Modal, StyleSheet, Image, Text, Pressable, Dimensions, ScrollView, Linking, Platform } from 'react-native';
import { X, Share2, FileText, ExternalLink } from 'lucide-react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { VaultDocument } from '../../contexts/FamilyContext';

interface DocumentViewerModalProps {
    visible: boolean;
    onClose: () => void;
    document: VaultDocument | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ visible, onClose, document }) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    if (!document || !document.uri) return null;

    const isImage = (uri: string) => {
        const lower = uri.toLowerCase();
        return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.heic');
    };

    const handleShare = async () => {
        // Implement share logic later if needed
    };

    const handleOpenExternal = async () => {
        try {
            if (document.uri) {
                await Linking.openURL(document.uri);
            }
        } catch (err) {
            console.error("Failed to open URL:", err);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={colors.foreground} />
                    </Pressable>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
                            {document.name}
                        </Text>
                        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                            {document.date}
                        </Text>
                    </View>
                    <Pressable onPress={handleOpenExternal} style={styles.shareBtn}>
                        <ExternalLink size={24} color={colors.primary} />
                    </Pressable>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {isImage(document.uri) ? (
                        <Image
                            source={{ uri: document.uri }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <FileText size={64} color={colors.mutedForeground} />
                            <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
                                Preview not available for this file type.
                            </Text>
                            <Pressable
                                style={[styles.openBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                                onPress={handleOpenExternal}
                            >
                                <Text style={[styles.openBtnText, { color: colors.primaryForeground }]}>Open in External App</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        justifyContent: 'space-between',
    },
    closeBtn: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerSub: {
        fontSize: 12,
    },
    shareBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: Dimensions.get('window').width,
        height: '100%',
    },
    placeholderContainer: {
        alignItems: 'center',
        padding: 32,
    },
    placeholderText: {
        marginTop: 16,
        marginBottom: 24,
        textAlign: 'center',
    },
    openBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    openBtnText: {
        fontWeight: '600',
    }
});
