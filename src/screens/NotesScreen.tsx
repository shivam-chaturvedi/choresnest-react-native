import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Dimensions,
    Platform,
    LayoutAnimation,
    UIManager,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { AppLayout } from "../components/layout/AppLayout";
import { AppIcon } from "../components/ui/AppIcon";
import { useSidebar } from "../contexts/SidebarContext"; // Assuming this exists or we use navigation drawer
import { format } from "date-fns";

// Enable LayoutAnimation
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

interface Note {
    id: string;
    title: string;
    content: string;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
    color: string;
}

const noteColors = [
    "#FFFFFF", // bg-card (assuming white/default)
    "#FFFBEB", // amber-50
    "#EFF6FF", // blue-50
    "#F0FDF4", // green-50
    "#FAF5FF", // purple-50
    "#FDF2F8", // pink-50
];

const initialNotes: Note[] = [
    {
        id: "1",
        title: "Welcome to Notes",
        content: "This is your personal note-taking space.\n\n• Simple and clean interface\n• Favorite important notes\n• Search across all notes\n\nStart writing to capture your thoughts!",
        isFavorite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        color: "#FFFFFF",
    },
    {
        id: "2",
        title: "Shopping List",
        content: "☐ Groceries for the week\n☐ New desk lamp\n☐ Notebooks\n☑ Coffee beans",
        isFavorite: false,
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
        color: "#FFFBEB",
    },
    {
        id: "3",
        title: "Project Ideas",
        content: "1. Recipe organizer with meal planning\n2. Family expense tracker\n3. Home maintenance scheduler\n\nNeed to research competitors and validate ideas.",
        isFavorite: true,
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 172800000),
        color: "#EFF6FF",
    },
    {
        id: "4",
        title: "Meeting Notes",
        content: "Team sync - Monday\n\n• Discussed Q1 goals\n• Action items assigned\n• Follow up next week",
        isFavorite: false,
        createdAt: new Date(Date.now() - 259200000),
        updatedAt: new Date(Date.now() - 259200000),
        color: "#F0FDF4",
    },
];

export const NotesScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp<Record<string, undefined>>>();
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const { openSidebar } = useSidebar();

    // Color picker dropdown state
    const [showColorPicker, setShowColorPicker] = useState(false);

    const createNewNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: "",
            content: "",
            isFavorite: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            color: noteColors[Math.floor(Math.random() * noteColors.length)],
        };
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNotes([newNote, ...notes]);
        setSelectedNote(newNote);
    };

    const updateNote = (field: "title" | "content", value: string) => {
        if (selectedNote) {
            const updatedNote = { ...selectedNote, [field]: value, updatedAt: new Date() };
            setNotes(notes.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
            setSelectedNote(updatedNote);
        }
    };

    const toggleFavorite = (noteId: string) => {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
            const updatedNote = { ...note, isFavorite: !note.isFavorite };
            setNotes(notes.map((n) => (n.id === noteId ? updatedNote : n)));
            if (selectedNote?.id === noteId) {
                setSelectedNote(updatedNote);
            }
        }
    };

    const deleteNote = (noteId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setNotes(notes.filter((n) => n.id !== noteId));
        if (selectedNote?.id === noteId) {
            setSelectedNote(null);
        }
    };

    const changeNoteColor = (noteId: string, color: string) => {
        const note = notes.find((n) => n.id === noteId);
        if (note) {
            const updatedNote = { ...note, color };
            setNotes(notes.map(n => n.id === noteId ? updatedNote : n));
            if (selectedNote?.id === noteId) {
                setSelectedNote(updatedNote);
            }
        }
        setShowColorPicker(false);
    };

    const filteredNotes = notes.filter(
        (note) =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const favoriteNotes = filteredNotes.filter((n) => n.isFavorite);
    const otherNotes = filteredNotes.filter((n) => !n.isFavorite);

    // --- EDITOR VIEW ---
    if (selectedNote) {
        return (
            <AppLayout showNav={false}>
                <View style={[styles.container, { backgroundColor: selectedNote.color }]}>
                    {/* Editor Header */}
                    <View style={styles.editorHeader}>
                        <Pressable
                            style={[styles.iconBtn, { borderRadius: radius.md }]}
                            onPress={() => setSelectedNote(null)}
                        >
                            <AppIcon name="chevronLeft" size={24} color={colors.foreground} />
                        </Pressable>

                        <View style={{ flex: 1 }} />

                        <Pressable
                            style={[styles.iconBtn, { borderRadius: radius.md }]}
                            onPress={() => toggleFavorite(selectedNote.id)}
                        >
                            <AppIcon
                                name="star"
                                size={22}
                                color={selectedNote.isFavorite ? "#F59E0B" : colors.mutedForeground}
                                // fill={selectedNote.isFavorite ? "#F59E0B" : "none"} // Lucide icons use fill prop in some versions, but here color usually tints stroke. 
                                // We'll rely on color for now or use a filled variant if available.
                                style={selectedNote.isFavorite ? { opacity: 1 } : { opacity: 0.5 }}
                            />
                        </Pressable>

                        <Pressable
                            style={[styles.iconBtn, { borderRadius: radius.md }]}
                            onPress={() => setShowColorPicker(!showColorPicker)}
                        >
                            <AppIcon name="more" size={22} color={colors.foreground} />
                        </Pressable>
                    </View>

                    {/* Color Picker Dropdown (Simple absolute view) */}
                    {showColorPicker && (
                        <View style={[styles.colorPicker, { shadowColor: theme.shadows.card.shadowColor, borderRadius: radius.lg }]}>
                            <View style={styles.colorRow}>
                                {noteColors.map(color => (
                                    <Pressable
                                        key={color}
                                        style={[
                                            styles.colorSwatch,
                                            { backgroundColor: color, borderRadius: radius.md },
                                            selectedNote.color === color && styles.colorSwatchActive
                                        ]}
                                        onPress={() => changeNoteColor(selectedNote.id, color)}
                                    />
                                ))}
                            </View>
                            <Pressable
                                style={styles.deleteOption}
                                onPress={() => deleteNote(selectedNote.id)}
                            >
                                <AppIcon name="trash" size={16} color={colors.danger} style={{ marginRight: 8 }} />
                                <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete Note</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Editor Content */}
                    <ScrollView contentContainerStyle={styles.editorContent}>
                        <TextInput
                            style={[styles.titleInput, { color: colors.foreground }]}
                            value={selectedNote.title}
                            onChangeText={(t) => updateNote("title", t)}
                            placeholder="Note title..."
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                        />
                        <TextInput
                            style={[styles.contentInput, { color: colors.foreground }]}
                            value={selectedNote.content}
                            onChangeText={(t) => updateNote("content", t)}
                            placeholder="Start writing..."
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.editorFooter}>
                            <AppIcon name="calendar" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                            <Text style={styles.dateText}>Edited {format(selectedNote.updatedAt, "MMM d, yyyy")}</Text>
                        </View>
                    </ScrollView>
                </View>
            </AppLayout>
        );
    }

    // --- LIST VIEW ---
    return (
        <AppLayout showNav={false} onAddPress={createNewNote}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={openSidebar} style={styles.menuBtn}>
                        <AppIcon name="menu" size={24} color={colors.foreground} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
                    <Pressable
                        style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                        onPress={createNewNote}
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
                            <Text style={[styles.statValue, { color: colors.foreground }]}>{notes.length}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                            <Text style={[styles.statValue, { color: "#F59E0B" }]}>{favoriteNotes.length}</Text>
                            <Text style={styles.statLabel}>Favorites</Text>
                        </View>
                    </View>

                    {/* Favorites Section */}
                    {favoriteNotes.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <AppIcon name="star" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                                <Text style={styles.sectionTitle}>FAVORITES</Text>
                            </View>
                            <View style={styles.grid}>
                                {favoriteNotes.map((note) => (
                                    <Pressable
                                        key={note.id}
                                        style={[styles.noteCard, { backgroundColor: note.color, borderColor: colors.border, borderRadius: radius.card }]}
                                        onPress={() => setSelectedNote(note)}
                                    >
                                        {note.isFavorite && (
                                            <View style={styles.cardStar}>
                                                <AppIcon name="star" size={14} color="#F59E0B" />
                                            </View>
                                        )}
                                        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{note.title || "Untitled"}</Text>
                                        <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={3}>{note.content || "Empty note"}</Text>
                                        <Text style={styles.cardDate}>{format(note.updatedAt, "MMM d")}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* All Notes Section */}
                    {otherNotes.length > 0 && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <AppIcon name="file" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                                <Text style={styles.sectionTitle}>ALL NOTES</Text>
                            </View>
                            <View style={styles.grid}>
                                {otherNotes.map((note) => (
                                    <Pressable
                                        key={note.id}
                                        style={[styles.noteCard, { backgroundColor: note.color, borderColor: colors.border, borderRadius: radius.card }]}
                                        onPress={() => setSelectedNote(note)}
                                    >
                                        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{note.title || "Untitled"}</Text>
                                        <Text style={[styles.cardPreview, { color: colors.mutedForeground }]} numberOfLines={3}>{note.content || "Empty note"}</Text>
                                        <Text style={styles.cardDate}>{format(note.updatedAt, "MMM d")}</Text>
                                    </Pressable>
                                ))}
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
                                <Pressable style={[styles.emptyBtn, { backgroundColor: colors.foreground, borderRadius: radius.md }]} onPress={createNewNote}>
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
        color: "#64748B",
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
        color: "#64748B",
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
        color: "#94A3B8",
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

    // Editor Styles
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    iconBtn: {
        padding: 8,
    },
    editorContent: {
        padding: 20,
        paddingBottom: 100,
    },
    titleInput: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 16,
        padding: 0,
    },
    contentInput: {
        fontSize: 16,
        lineHeight: 24,
        minHeight: 300,
        padding: 0,
        marginBottom: 20,
    },
    editorFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    dateText: {
        fontSize: 12,
        color: "#94A3B8",
    },
    colorPicker: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: '#fff',
        padding: 16,
        zIndex: 10,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    colorRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    colorSwatchActive: {
        borderColor: theme.colors.primary,
        transform: [{ scale: 1.2 }],
    },
    deleteOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
});
