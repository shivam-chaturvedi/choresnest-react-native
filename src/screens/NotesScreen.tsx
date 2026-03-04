import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Dimensions,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useTheme, useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppLayout } from "../components/layout";
import { AppIcon } from "../components/ui/AppIcon";
import { useSidebar } from "../contexts/SidebarContext";
import { safeFormat, ensureDate } from "../utils/SafeDateUtils";
import { useNotes, Note } from "../contexts/NotesContext";

const parseRgbFromHex = (value: string) => {
    const hex = value.trim().replace("#", "");
    if (hex.length === 3) {
        const expanded = hex.split("").map((c) => c + c).join("");
        return expanded;
    }
    if (hex.length === 6) {
        return hex;
    }
    return null;
};

const parseColorString = (value: string) => {
    if (!value) return null;
    const normalized = value.trim();
    if (normalized.startsWith("#")) {
        const hex = parseRgbFromHex(normalized);
        if (hex) {
            return {
                r: parseInt(hex.slice(0, 2), 16),
                g: parseInt(hex.slice(2, 4), 16),
                b: parseInt(hex.slice(4, 6), 16),
            };
        }
    }
    const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) {
        return {
            r: Number(rgbMatch[1]),
            g: Number(rgbMatch[2]),
            b: Number(rgbMatch[3]),
        };
    }
    return null;
};

const getColorBrightness = (value?: string) => {
    const rgb = value ? parseColorString(value) : null;
    if (!rgb) return null;
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

export const NotesScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { appearanceMode } = useTheme();
    const { openSidebar } = useSidebar();
    const { folders } = useNotes();
    const [searchQuery, setSearchQuery] = useState("");

    const getCardTextColors = (cardColor?: string) => {
        if (appearanceMode !== 'midnight') {
            return {
                primary: colors.foreground,
                secondary: colors.mutedForeground,
            };
        }
        const brightness = getColorBrightness(cardColor);
        const isLightCard = brightness !== null && brightness > 180;
        if (isLightCard) {
            return {
                primary: "#0F172A",
                secondary: "#475569",
            };
        }
        return {
            primary: colors.foreground,
            secondary: colors.mutedForeground,
        };
    };

    // Flatten all notes from all folders
    const allNotes = useMemo(() => {
        return folders.flatMap(f => f.notes).sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }, [folders]);

    const filteredNotes = allNotes.filter(
        (note) =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.preview.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favoriteNotes = filteredNotes.filter((n) => n.isStarred);
    const otherNotes = filteredNotes.filter((n) => !n.isStarred);

    const handleCreateNote = () => {
        // Default to first folder for now
        const defaultFolderId = folders[0]?.id;
        if (defaultFolderId) {
            navigation.navigate('NoteDetail', { folderId: defaultFolderId });
        }
    };

    const handleNotePress = (note: Note) => {
        navigation.navigate('NoteDetail', { noteId: note.id });
    };

    return (
        <AppLayout showNav={false} onAddPress={handleCreateNote}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={openSidebar} style={styles.menuBtn}>
                        <AppIcon name="menu" size={24} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
                    <Pressable
                        style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                        onPress={handleCreateNote}
                    >
                        <AppIcon name="plus" size={20} color="#fff" />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.listContent}>
                    {/* Search */}
                    <View style={[styles.searchBar, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                        <AppIcon name="search" size={20} color={colors.mutedForeground} style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.foreground }]}
                            placeholder="Search notes..."
                            placeholderTextColor={colors.mutedForeground}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                            <Text style={[styles.statValue, { color: colors.foreground }]}>{allNotes.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                            <Text style={[styles.statValue, { color: "#F59E0B" }]}>{favoriteNotes.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Favorites</Text>
                        </View>
                    </View>

                    {/* Favorites Section */}
                    {favoriteNotes.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <AppIcon name="star" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FAVORITES</Text>
                            </View>
                            <View style={styles.grid}>
                                {favoriteNotes.map((note) => {
                                    const cardColors = getCardTextColors(note.color);
                                    return (
                                        <Pressable
                                            key={note.id}
                                            style={[styles.noteCard, { backgroundColor: note.color, borderColor: colors.border, borderRadius: radius.card }]}
                                            onPress={() => handleNotePress(note)}
                                        >
                                            <View style={styles.cardStar}>
                                                <AppIcon name="star" size={14} color="#F59E0B" />
                                            </View>
                                            <Text style={[styles.cardTitle, { color: cardColors.primary }]} numberOfLines={1}>{note.title || "Untitled"}</Text>
                                            <Text style={[styles.cardPreview, { color: cardColors.secondary }]} numberOfLines={3}>{note.preview || "No preview"}</Text>
                                            <Text style={[styles.cardDate, { color: cardColors.secondary }]}>{safeFormat(ensureDate(note.updatedAt), "MMM d")}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* All Notes Section */}
                    {otherNotes.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <AppIcon name="file" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                                <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ALL NOTES</Text>
                            </View>
                            <View style={styles.grid}>
                                {otherNotes.map((note) => {
                                    const cardColors = getCardTextColors(note.color);
                                    return (
                                        <Pressable
                                            key={note.id}
                                            style={[styles.noteCard, { backgroundColor: note.color, borderColor: colors.border, borderRadius: radius.card }]}
                                            onPress={() => handleNotePress(note)}
                                        >
                                            <Text style={[styles.cardTitle, { color: cardColors.primary }]} numberOfLines={1}>{note.title || "Untitled"}</Text>
                                            <Text style={[styles.cardPreview, { color: cardColors.secondary }]} numberOfLines={3}>{note.preview || "No preview"}</Text>
                                            <Text style={[styles.cardDate, { color: cardColors.secondary }]}>{safeFormat(ensureDate(note.updatedAt), "MMM d")}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    {/* Empty State */}
                    {filteredNotes.length === 0 && (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIcon, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
                                <AppIcon name="file" size={32} color={colors.mutedForeground} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{searchQuery ? "No notes found" : "No notes yet"}</Text>
                            <Text style={styles.emptySub}>{searchQuery ? "Try a different search term" : "Create your first note"}</Text>
                            {!searchQuery && (
                                <Pressable style={[styles.emptyBtn, { backgroundColor: colors.foreground, borderRadius: radius.md }]} onPress={handleCreateNote}>
                                    <AppIcon name="plus" size={16} color={colors.background} style={{ marginRight: 8 }} />
                                    <Text style={[styles.emptyBtnText, { color: colors.background }]}>New Note</Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
        </AppLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 10,
        height: 50,
    },
    menuBtn: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        marginLeft: 8,
    },
    addBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    noteCard: {
        width: (Dimensions.get('window').width - 40 - 12) / 2,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',

        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    cardPreview: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 12,
    },
    cardDate: {
        fontSize: 11,
    },
    cardStar: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    emptyState: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyIcon: {
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 20,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    emptyBtnText: {
        fontWeight: '600',
        fontSize: 15,
    },
});
