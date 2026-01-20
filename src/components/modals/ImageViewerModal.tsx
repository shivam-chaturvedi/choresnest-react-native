import React from 'react';
import { View, Modal, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';

interface ImageViewerModalProps {
    visible: boolean;
    onClose: () => void;
    imageUri: string | null;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ visible, onClose, imageUri }) => {
    const colors = useThemeColors();

    if (!imageUri) return null;

    const getSource = () => {
        if (!imageUri) return {};
        let uri = imageUri;
        if (!uri.startsWith('http') && !uri.startsWith('file://') && !uri.startsWith('content://')) {
            uri = `file://${uri}`;
        }
        return { uri };
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                    <X size={24} color={colors.foreground} />
                </Pressable>

                <View style={[styles.imageContainer, { backgroundColor: 'transparent' }]}>
                    <Image
                        source={getSource()}
                        style={styles.fullImage}
                        resizeMode="contain"
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    closeBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    imageContainer: {
        width: '100%',
        height: '80%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
});
