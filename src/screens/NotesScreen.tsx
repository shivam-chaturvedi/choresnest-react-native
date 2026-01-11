import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, LayoutAnimation, Platform, UIManager, Modal } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";
import { AppLayout } from "../components/layout/AppLayout";
import { AppIcon, AppIconName } from "../components/ui/AppIcon";
import { useNotes, Folder, Note } from "../contexts/NotesContext";

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const NotesScreen: React.FC = () => {
    const { folders, addFolder, deleteFolder } = useNotes();
    const navigation = useNavigation<any>();
    const [search, setSearch] = useState("");
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

    // UI State
    const [showAddFolderModal, setShowAddFolderModal] = useState(false);
    const [newFolderTitle, setNewFolderTitle] = useState("");
    const [activeFolderMenu, setActiveFolderMenu] = useState<string | null>(null);

    React.useEffect(() => {
        // Initialize expanded state
        const initialExpanded: Record<string, boolean> = {};
        folders.forEach(f => initialExpanded[f.id] = true);
        setExpandedFolders(initialExpanded);
    }, [folders.length]);

    const toggleFolder = (folderId: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    const handleCreateFolder = () => {
        if (newFolderTitle.trim()) {
            addFolder(newFolderTitle.trim());
            setNewFolderTitle("");
            setShowAddFolderModal(false);
        }
    };

    const handleDeleteFolder = (id: string) => {
        deleteFolder(id);
        setActiveFolderMenu(null);
    };

    const renderFolder = (folder: Folder) => {
        if (search) {
            const matchingNotes = folder.notes.filter(n =>
                n.title.toLowerCase().includes(search.toLowerCase()) ||
                (n.preview && n.preview.toLowerCase().includes(search.toLowerCase()))
            );

            const folderMatches = folder.title.toLowerCase().includes(search.toLowerCase());

            if (matchingNotes.length === 0 && !folderMatches) return null;

            return (
                <View key={folder.id} style={styles.folderContainer}>
                    <View style={styles.folderHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <AppIcon name={folder.icon as AppIconName} size={18} color={theme.colors.foreground} style={{ marginRight: 8 }} />
                            <Text style={styles.folderTitle}>{folder.title}</Text>
                            <Text style={styles.noteCount}>({matchingNotes.length})</Text>
                        </View>
                    </View>
                    <View style={styles.notesList}>
                        {matchingNotes.map(note => renderNoteItem(note))}
                    </View>
                </View>
            );
        }

        const isExpanded = expandedFolders[folder.id];

        return (
            <View key={folder.id} style={styles.folderContainer}>
                <Pressable onPress={() => toggleFolder(folder.id)} style={styles.folderHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable onPress={() => toggleFolder(folder.id)} hitSlop={8}>
                            <AppIcon name={isExpanded ? "chevronDown" : "chevronRight"} size={16} color={theme.colors.mutedForeground} style={{ marginRight: 8 }} />
                        </Pressable>
                        <AppIcon name={folder.icon as AppIconName} size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                        <Text style={styles.folderTitle}>{folder.title}</Text>
                        <Text style={styles.noteCount}>{folder.notes.length}</Text>
                    </View>
                    <Pressable onPress={() => setActiveFolderMenu(folder.id)}>
                        <AppIcon name="more" size={16} color={theme.colors.mutedForeground} />
                    </Pressable>
                </Pressable>

                {isExpanded && (
                    <View style={styles.notesList}>
                        {folder.notes.length === 0 ? (
                            <Text style={styles.emptyFolder}>No notes inside</Text>
                        ) : (
                            folder.notes.map(note => renderNoteItem(note))
                        )}
                        <Pressable style={styles.addNoteRow} onPress={() => navigation.navigate("NoteDetail", { folderId: folder.id })}>
                            <AppIcon name="plus" size={14} color={theme.colors.mutedForeground} style={{ marginRight: 6 }} />
                            <Text style={styles.addNoteText}>New page inside</Text>
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    const renderNoteItem = (note: Note) => (
        <Pressable
            key={note.id}
            style={styles.noteRow}
            onPress={() => navigation.navigate("NoteDetail", { noteId: note.id })}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="fileText" size={16} color={theme.colors.mutedForeground} style={{ marginRight: 10 }} />
                <Text style={styles.noteRowTitle}>{note.title}</Text>
            </View>
        </Pressable>
    );

    return (
        <AppLayout showNav={false} onAddPress={() => navigation.navigate("NoteDetail")}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <AppIcon name="arrowLeft" size={24} color={theme.colors.foreground} />
                    </Pressable>
                    <Text style={styles.headerTitle}>Notes</Text>
                    <Pressable style={styles.iconBtn}>
                        <AppIcon name="more" size={24} color={theme.colors.foreground} />
                    </Pressable>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <AppIcon name="search" size={20} color={theme.colors.mutedForeground} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search notes..."
                        placeholderTextColor={theme.colors.mutedForeground}
                        style={styles.input}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Categories/Folders */}
                <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
                    {folders.map(folder => renderFolder(folder))}

                    <Pressable style={styles.addFolderBtn} onPress={() => setShowAddFolderModal(true)}>
                        <AppIcon name="plus" size={16} color={theme.colors.mutedForeground} style={{ marginRight: 8 }} />
                        <Text style={styles.addFolderText}>Add a folder</Text>
                    </Pressable>
                </ScrollView>
            </View>

            {/* Add Folder Modal */}
            <Modal visible={showAddFolderModal} transparent animationType="fade" onRequestClose={() => setShowAddFolderModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>New Folder</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Folder Name"
                            placeholderTextColor={theme.colors.mutedForeground}
                            value={newFolderTitle}
                            onChangeText={setNewFolderTitle}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <Pressable onPress={() => setShowAddFolderModal(false)} style={styles.modalBtnCancel}>
                                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={handleCreateFolder} style={styles.modalBtnCreate}>
                                <Text style={styles.modalBtnTextCreate}>Create</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Folder Actions Menu */}
            <Modal visible={!!activeFolderMenu} transparent animationType="fade" onRequestClose={() => setActiveFolderMenu(null)}>
                <Pressable style={styles.modalOverlay} onPress={() => setActiveFolderMenu(null)}>
                    <View style={styles.menuCard}>
                        <Pressable style={styles.menuItem} onPress={() => activeFolderMenu && handleDeleteFolder(activeFolderMenu)}>
                            <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete Folder</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>

        </AppLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        marginBottom: 16,
        height: 56,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: theme.colors.foreground,
    },
    iconBtn: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.foreground,
        height: "100%",
    },
    contentScroll: {
        paddingBottom: 100,
    },
    folderContainer: {
        marginBottom: 4,
    },
    folderHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 6,
    },
    folderTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: theme.colors.foreground,
        marginRight: 6,
    },
    noteCount: {
        fontSize: 12,
        color: theme.colors.mutedForeground,
    },
    notesList: {
        paddingLeft: 28, // Indent
    },
    noteRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.03)",
    },
    noteRowTitle: {
        fontSize: 15,
        color: theme.colors.foreground,
    },
    emptyFolder: {
        fontSize: 13,
        color: theme.colors.mutedForeground,
        fontStyle: "italic",
        paddingVertical: 8,
    },
    addNoteRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        opacity: 0.7,
    },
    addNoteText: {
        fontSize: 14,
        color: theme.colors.mutedForeground,
    },
    addFolderBtn: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    addFolderText: {
        fontSize: 15,
        color: theme.colors.mutedForeground,
        fontWeight: "500",
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: theme.colors.foreground,
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: theme.colors.foreground,
        marginBottom: 20,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    modalBtnCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalBtnTextCancel: {
        fontSize: 16,
        color: theme.colors.mutedForeground,
    },
    modalBtnCreate: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    modalBtnTextCreate: {
        fontSize: 16,
        color: "#fff",
        fontWeight: "600",
    },
    menuCard: {
        position: 'absolute',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        paddingVertical: 8,
        minWidth: 160,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    menuItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    menuText: {
        fontSize: 15,
        color: theme.colors.foreground,
    },
});
