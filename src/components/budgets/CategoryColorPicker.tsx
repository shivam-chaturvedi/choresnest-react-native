import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { CATEGORY_COLOR_PALETTE } from '../../constants/categoryColors';

interface CategoryColorPickerProps {
    visible: boolean;
    value?: string;
    onSelect: (colorHex: string) => void;
    onClose: () => void;
    title?: string;
    disabledColors?: Set<string>;
}

export const CategoryColorPicker: React.FC<CategoryColorPickerProps> = ({
    visible,
    value,
    onSelect,
    onClose,
    title = 'Choose category color',
    disabledColors,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const disabledSet = disabledColors ?? new Set<string>();

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalRoot}>
                <Pressable style={styles.overlay} onPress={onClose} />
                <View style={[styles.content, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                    <View style={styles.grid}>
                        {CATEGORY_COLOR_PALETTE.map(color => {
                            const isSelected = value === color;
                            const isDisabled = disabledSet.has(color);
                            return (
                                <Pressable
                                    key={color}
                                    onPress={() => onSelect(color)}
                                    disabled={isDisabled}
                                    style={[
                                        styles.colorCircle,
                                        {
                                            backgroundColor: color,
                                            borderColor: isSelected ? colors.primary : 'transparent',
                                            borderWidth: isSelected ? 2 : 0,
                                            opacity: isDisabled ? 0.45 : 1,
                                        },
                                    ]}
                                >
                                    {isSelected && <Check size={18} color={colors.card} />}
                                    {isDisabled && <View style={styles.disabledLine} />}
                                </Pressable>
                            );
                        })}
                    </View>
                    <Pressable style={[styles.dismissButton, { borderColor: colors.border }]} onPress={onClose}>
                        <Text style={[styles.dismissText, { color: colors.foreground }]}>Cancel</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        width: '100%',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    grid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        margin: 6,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    disabledLine: {
        position: 'absolute',
        width: 30,
        height: 2,
        backgroundColor: '#fff',
        transform: [{ rotate: '45deg' }],
    },
    dismissButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderRadius: 12,
    },
    dismissText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
