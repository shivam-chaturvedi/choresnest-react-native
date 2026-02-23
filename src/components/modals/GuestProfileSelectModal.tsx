import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    FlatList,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { theme } from '../../theme';
import { useThemeColors } from '../../contexts/ThemeContext';
import { MemberIcon } from '../ui';

const { height } = Dimensions.get('window');

interface Profile {
    id: string;
    email: string;
    name?: string;
}

interface GuestProfileSelectModalProps {
    visible: boolean;
    profiles: Profile[];
    onSelect: (profileId: string) => void;
    onCancel: () => void;
}

export const GuestProfileSelectModal: React.FC<GuestProfileSelectModalProps> = ({
    visible,
    profiles,
    onSelect,
    onCancel,
}) => {
    const colors = useThemeColors();
    const radius = theme.radius;

    const renderProfileItem = ({ item }: { item: Profile }) => (
        <TouchableOpacity
            style={[
                styles.profileItem,
                { backgroundColor: colors.muted + '50', borderRadius: radius.lg, borderColor: colors.border }
            ]}
            onPress={() => onSelect(item.id)}
        >
            <View style={[styles.avatar, { backgroundColor: colors.primary + '20', borderRadius: radius.full }]}>
                <MemberIcon symbol="account" size={24} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]}>
                    {item.name || 'User'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
                    {item.email}
                </Text>
            </View>
            <MemberIcon symbol="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onCancel} />
                <View style={[styles.content, { backgroundColor: colors.background, borderRadius: radius.xl }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.foreground }]}>Select Local Profile</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            Choose which account's local data you want to access in Guest Mode.
                        </Text>
                    </View>

                    <FlatList
                        data={profiles}
                        keyExtractor={(item) => item.id}
                        renderItem={renderProfileItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                                No local profiles found.
                            </Text>
                        }
                    />

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.cancelButton, { backgroundColor: colors.muted, borderRadius: radius.lg }]}
                            onPress={onCancel}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.guestModeButton, { backgroundColor: colors.primary + '10', borderRadius: radius.lg }]}
                            onPress={() => onSelect('')}
                        >
                            <Text style={[styles.guestModeButtonText, { color: colors.primary }]}>
                                New Guest Session
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    content: {
        width: '100%',
        maxHeight: height * 0.7,
        padding: theme.spacing.xl,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: theme.spacing.xs,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    listContent: {
        gap: theme.spacing.md,
        paddingBottom: theme.spacing.md,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        borderWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '700',
    },
    profileEmail: {
        fontSize: 13,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: theme.spacing.xl,
    },
    footer: {
        marginTop: theme.spacing.xl,
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    cancelButton: {
        flex: 1,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontWeight: '600',
    },
    guestModeButton: {
        flex: 1.5,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    guestModeButtonText: {
        fontWeight: '700',
    },
});
