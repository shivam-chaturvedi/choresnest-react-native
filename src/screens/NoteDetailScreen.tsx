import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    Pressable,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    Keyboard,
    Alert
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { theme } from "../theme";
import { useThemeColors, useThemeRadius } from '../contexts/ThemeContext';
import {
    ChevronLeft,
    Star,
    MoreHorizontal,
    Plus,
    Type,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Quote,
    Code,
    Minus,
    Trash,
    Edit3
} from "lucide-react-native";
import { useNotes, Note, NoteBlock } from "../contexts/NotesContext";

export const NoteDetailScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { addNote, updateNote, deleteNote, getNote } = useNotes();
    const colors = useThemeColors();
    const radius = useThemeRadius();

    // Params
    const initialNoteParam = route.params?.note;
    const folderIdParam = route.params?.folderId;
    const noteIdParam = route.params?.noteId; // Support both object and ID passing

    const [noteId, setNoteId] = useState<string | null>(initialNoteParam?.id || noteIdParam || null);
    const [title, setTitle] = useState(initialNoteParam?.title || "Untitled");
    const [blocks, setBlocks] = useState<NoteBlock[]>(initialNoteParam?.blocks || [
        { id: '1', type: 'text', content: '' }
    ]);
    const [isStarred, setIsStarred] = useState(initialNoteParam?.isStarred || false);

    // If opened with ID, sync with context
    useEffect(() => {
        if (noteIdParam) {
            const freshNote = getNote(noteIdParam);
            if (freshNote) {
                setNoteId(freshNote.id);
                setTitle(freshNote.title);
                setBlocks(freshNote.blocks);
                setIsStarred(freshNote.isStarred || false);
            }
        }
    }, [noteIdParam]);

    // Create new note logic
    useEffect(() => {
        if (folderIdParam && !noteId) {
            let isActive = true;
            const createNote = async () => {
                const createdId = await addNote(folderIdParam, {
                    title: "Untitled",
                    blocks: [{ id: '1', type: 'text', content: '' }]
                });
                if (isActive && createdId) {
                    setNoteId(createdId);
                }
            };
            createNote();
            return () => {
                isActive = false;
            };
        }
    }, [folderIdParam, noteId, addNote]);

    // Auto-save effect
    useEffect(() => {
        if (noteId) {
            const timer = setTimeout(() => {
                const preview = blocks.find(b => b.content.trim().length > 0)?.content.substring(0, 50) || "No content";
                updateNote(noteId, {
                    title,
                    blocks,
                    preview,
                    isStarred
                });
            }, 500); // Debounce 500ms
            return () => clearTimeout(timer);
        }
    }, [title, blocks, isStarred, noteId]);

    // Menus
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Mock timestamp
    const lastEdited = "Last edited " + new Date().toLocaleTimeString();

    const addBlock = (type: NoteBlock['type']) => {
        const newBlock: NoteBlock = {
            id: Date.now().toString(),
            type,
            content: '',
            checked: false
        };
        setBlocks(prev => [...prev, newBlock]);
        setShowAddMenu(false);
    };

    const updateBlock = (id: string, text: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: text } : b));
    };

    const toggleTodo = (id: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, checked: !b.checked } : b));
    };

    const handleDeleteNote = () => {
        if (noteId) {
            deleteNote(noteId);
            navigation.goBack();
        }
    };

    // Render Blocks
    const renderBlock = (block: NoteBlock) => {
        return (
            <View key={block.id} style={styles.blockWrapper}>
                {block.type === 'h1' && (
                    <TextInput
                        style={[styles.blockInput, styles.h1, { color: colors.foreground }]}
                        value={block.content}
                        onChangeText={(t) => updateBlock(block.id, t)}
                        placeholder="Heading 1"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                    />
                )}
                {block.type === 'h2' && (
                    <TextInput
                        style={[styles.blockInput, styles.h2, { color: colors.foreground }]}
                        value={block.content}
                        onChangeText={(t) => updateBlock(block.id, t)}
                        placeholder="Heading 2"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                    />
                )}
                {block.type === 'h3' && (
                    <TextInput
                        style={[styles.blockInput, styles.h3, { color: colors.foreground }]}
                        value={block.content}
                        onChangeText={(t) => updateBlock(block.id, t)}
                        placeholder="Heading 3"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                    />
                )}
                {block.type === 'bullet' && (
                    <View style={styles.listBlock}>
                        <Text style={[styles.bulletPoint, { color: colors.foreground }]}>•</Text>
                        <TextInput
                            style={[styles.blockInput, { color: colors.foreground }]}
                            value={block.content}
                            onChangeText={(t) => updateBlock(block.id, t)}
                            placeholder="List item"
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                        />
                    </View>
                )}
                {block.type === 'todo' && (
                    <View style={styles.listBlock}>
                        <Pressable
                            onPress={() => toggleTodo(block.id)}
                            style={[
                                styles.checkbox,
                                { borderColor: colors.mutedForeground, borderRadius: radius.xs },
                                block.checked && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                        >
                            {block.checked && <CheckSquare size={14} color="#fff" />}
                        </Pressable>
                        <TextInput
                            style={[
                                styles.blockInput,
                                { color: colors.foreground },
                                block.checked && { textDecorationLine: 'line-through', color: colors.mutedForeground }
                            ]}
                            value={block.content}
                            onChangeText={(t) => updateBlock(block.id, t)}
                            placeholder="To-do"
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                        />
                    </View>
                )}
                {block.type === 'quote' && (
                    <View style={styles.quoteBlock}>
                        <View style={[styles.quoteBar, { backgroundColor: colors.muted, borderRadius: radius.xs }]} />
                        <TextInput
                            style={[styles.blockInput, { fontStyle: 'italic', color: colors.foreground }]}
                            value={block.content}
                            onChangeText={(t) => updateBlock(block.id, t)}
                            placeholder="Quote"
                            placeholderTextColor={colors.mutedForeground}
                            multiline
                        />
                    </View>
                )}
                {block.type === 'divider' && <View style={[styles.dividerBlock, { backgroundColor: colors.border }]} />}
                {(block.type === 'text' || block.type === 'code' || block.type === 'number') && (
                    <TextInput
                        style={[styles.blockInput, { color: colors.foreground }]}
                        value={block.content}
                        onChangeText={(t) => updateBlock(block.id, t)}
                        placeholder="Type something..."
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                    />
                )}
            </View>
        );
    };

    const addMenuOptions = [
        { label: "Text", icon: Type, type: 'text' },
        { label: "Heading 1", icon: Heading1, type: 'h1' },
        { label: "Heading 2", icon: Heading2, type: 'h2' },
        { label: "Heading 3", icon: Heading3, type: 'h3' },
        { label: "Bullet List", icon: List, type: 'bullet' },
        { label: "To-do", icon: CheckSquare, type: 'todo' },
        { label: "Quote", icon: Quote, type: 'quote' },
        { label: "Divider", icon: Minus, type: 'divider' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderRadius: radius.sm }]}>
                    <ChevronLeft size={24} color={colors.foreground} />
                </Pressable>
                <View style={{ flex: 1 }} />
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <Pressable onPress={() => setIsStarred(!isStarred)} style={[styles.iconBtn, { borderRadius: radius.sm }]}>
                        <Star size={22} color={isStarred ? colors.warning : colors.mutedForeground} fill={isStarred ? colors.warning : "transparent"} />
                    </Pressable>
                    <Pressable onPress={() => setShowMoreMenu(true)} style={[styles.iconBtn, { borderRadius: radius.sm }]}>
                        <MoreHorizontal size={22} color={colors.foreground} />
                    </Pressable>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Title Area */}
                <TextInput
                    style={[styles.titleInput, { color: colors.foreground }]}
                    placeholder="Untitled"
                    placeholderTextColor={colors.mutedForeground}
                    value={title}
                    onChangeText={setTitle}
                    multiline
                />

                <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>{lastEdited}</Text>

                <View style={{ height: 24 }} />

                {/* Blocks */}
                <View style={styles.blocksContainer}>
                    {blocks.map((block) => renderBlock(block))}
                </View>

                {/* Add Block Button */}
                <Pressable style={styles.addBlockBtn} onPress={() => setShowAddMenu(true)}>
                    <Plus size={20} color={colors.mutedForeground} />
                    <Text style={[styles.addBlockText, { color: colors.mutedForeground }]}>Add a block</Text>
                </Pressable>
            </ScrollView>

            {/* Add Block Menu Modal */}
            <Modal visible={showAddMenu} transparent animationType="fade" onRequestClose={() => setShowAddMenu(false)}>
                <TouchableWithoutFeedback onPress={() => setShowAddMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow, borderRadius: radius.sm }]}>
                                <ScrollView style={{ maxHeight: 300 }}>
                                    {addMenuOptions.map((opt, idx) => (
                                        <Pressable
                                            key={idx}
                                            style={styles.menuItem}
                                            onPress={() => addBlock(opt.type as any)}
                                        >
                                            <opt.icon size={18} color={colors.foreground} style={{ marginRight: 12 }} />
                                            <Text style={[styles.menuText, { color: colors.foreground }]}>{opt.label}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* More Options Menu Modal */}
            <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
                <TouchableWithoutFeedback onPress={() => setShowMoreMenu(false)}>
                    <View style={[styles.modalOverlay, { alignItems: 'flex-end', paddingBottom: 0, justifyContent: 'flex-start', paddingTop: 60, paddingRight: 16 }]}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.moreMenuCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow, borderRadius: radius.sm }]}>
                                <Pressable style={styles.moreMenuItem} onPress={() => setShowMoreMenu(false)}>
                                    <Edit3 size={16} color={colors.foreground} style={{ marginRight: 10 }} />
                                    <Text style={[styles.menuText, { color: colors.foreground }]}>Rename</Text>
                                </Pressable>
                                <Pressable style={styles.moreMenuItem} onPress={handleDeleteNote}>
                                    <Trash size={16} color={colors.danger} style={{ marginRight: 10 }} />
                                    <Text style={[styles.menuText, { color: colors.danger }]}>Delete</Text>
                                </Pressable>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    iconBtn: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    titleInput: {
        fontSize: 32,
        fontWeight: "700",
        marginBottom: 8,
        marginTop: 12,
    },
    timestamp: {
        fontSize: 13,
        marginBottom: 24,
    },
    blocksContainer: {
        gap: 8,
    },
    blockWrapper: {
        marginBottom: 4,
    },
    blockInput: {
        fontSize: 16,
        padding: 0,
        textAlignVertical: 'top',
        lineHeight: 24,
    },
    h1: {
        fontSize: 24,
        fontWeight: "700",
        marginBottom: 8,
        marginTop: 12,
    },
    h2: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 6,
        marginTop: 10,
    },
    h3: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 4,
        marginTop: 8,
    },
    listBlock: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bulletPoint: {
        fontSize: 16,
        marginRight: 8,
        marginTop: 2,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1.5,
        marginRight: 10,
        marginTop: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quoteBlock: {
        flexDirection: 'row',
        paddingVertical: 4,
    },
    quoteBar: {
        width: 3,
        marginRight: 12,
    },
    dividerBlock: {
        height: 1,
        marginVertical: 12,
    },
    addBlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    addBlockText: {
        fontSize: 15,
        marginLeft: 8,
    },
    // Menus
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.1)", // Very light dim
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuCard: {
        width: 200,
        paddingVertical: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    menuText: {
        fontSize: 15,
    },
    moreMenuCard: {
        width: 150,
        paddingVertical: 4,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
    },
    moreMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    }
});
