import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { database } from '../database';
import { Folder as DbFolder, Note as DbNote } from '../database/models/Note';
import { Q } from '@nozbe/watermelondb';

// Types
export interface NoteBlock {
    id: string;
    type: 'text' | 'h1' | 'h2' | 'h3' | 'bullet' | 'number' | 'todo' | 'quote' | 'code' | 'divider';
    content: string;
    checked?: boolean;
}

export interface Note {
    id: string;
    title: string;
    preview: string; // For list view
    tag: string;
    color: string;
    updatedAt: string;
    blocks: NoteBlock[];
    isStarred?: boolean;
    folderId: string;
}

export interface Folder {
    id: string;
    title: string;
    icon: string;
    notes: Note[];
}

interface NotesContextType {
    folders: Folder[];
    addFolder: (title: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    addNote: (folderId: string, note?: Partial<Note>) => Promise<string | null>;
    updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
    deleteNote: (noteId: string) => Promise<void>;
    getNote: (noteId: string) => Note | undefined;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [folderMeta, setFolderMeta] = useState<{ id: string; title: string; icon: string }[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);

    const folders = useMemo(() => {
        return folderMeta.map(folder => ({
            ...folder,
            notes: notes.filter(note => note.folderId === folder.id),
        }));
    }, [folderMeta, notes]);

    const ensureDefaultFolder = useCallback(async () => {
        try {
            const collection = database.get<DbFolder>('folders');
            const existing = await collection.query().fetch();
            if (existing.length === 0) {
                await database.write(async () => {
                    await collection.create(folder => {
                        folder.title = 'Notes';
                        folder.icon = 'file';
                    });
                });
            }
        } catch (error) {
            console.error("Failed to ensure notes folder:", error);
        }
    }, []);

    useEffect(() => {
        ensureDefaultFolder();
    }, [ensureDefaultFolder]);

    useEffect(() => {
        const collection = database.get<DbFolder>('folders');
        const subscription = collection.query().observe().subscribe({
            next: (records) => {
                setFolderMeta(records.map(record => ({
                    id: record.id,
                    title: record.title,
                    icon: record.icon,
                })));
            },
            error: (error) => console.error("Notes folder subscription failed", error),
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const collection = database.get<DbNote>('notes');
        // We use observeWithColumns to ensure we receive updates when these specific fields change
        // We also add a sort to ensure the initial order is correct, though JS generic sort handles re-ordering
        const subscription = collection.query(
            Q.sortBy('updated_at', Q.desc)
        ).observeWithColumns(['title', 'preview', 'is_starred', 'updated_at', 'blocks_json']).subscribe({
            next: (records) => {
                console.log(`📥 NotesContext: Received ${records.length} notes update`);
                const mapped = records
                    .map(record => ({
                        id: record.id,
                        title: record.title,
                        preview: record.preview || 'No content',
                        tag: record.tag || 'General',
                        color: record.color,
                        updatedAt: new Date(record.updatedAt).toISOString(),
                        blocks: Array.isArray(record.blocks) ? record.blocks : [],
                        isStarred: record.isStarred,
                        folderId: record.folderId,
                    }))
                    // Sort again in JS to be absolutely sure the UI reflects the latest order
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                setNotes(mapped);
            },
            error: (error) => console.error("Notes subscription failed", error),
        });
        return () => subscription.unsubscribe();
    }, []);

    const addFolder = useCallback(async (title: string) => {
        try {
            if (!title) return;
            await database.write(async () => {
                await database.get<DbFolder>('folders').create(folder => {
                    folder.title = title;
                    folder.icon = 'folder';
                });
            });
        } catch (error) {
            console.error("Error adding folder:", error);
        }
    }, []);

    const deleteFolder = useCallback(async (id: string) => {
        try {
            if (!id) return;
            await database.write(async () => {
                const notesCollection = database.get<DbNote>('notes');
                const folderNotes = await notesCollection.query(Q.where('folder_id', id)).fetch();
                await Promise.all(folderNotes.map(note => note.destroyPermanently()));
                const folder = await database.get<DbFolder>('folders').find(id);
                await folder.destroyPermanently();
            });
        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    }, []);

    const computePreview = (noteData?: Partial<Note>) => {
        // Try to find the first non-empty block with meaningful content
        const blocks = noteData?.blocks || [];

        // Filter out dividers and empty blocks
        const contentBlocks = blocks.filter(block =>
            block.type !== 'divider' &&
            block.content?.trim().length > 0
        );

        if (contentBlocks.length > 0) {
            const firstBlock = contentBlocks[0];
            let preview = firstBlock.content.trim();

            // For todo items, add checkbox indicator
            if (firstBlock.type === 'todo') {
                preview = `${firstBlock.checked ? '✓' : '☐'} ${preview}`;
            }

            // Limit to 100 characters for better preview
            return preview.slice(0, 100);
        }

        // Fallback to provided preview or default
        if (noteData?.preview && noteData.preview !== 'No content') {
            return noteData.preview;
        }

        return 'No content';
    };

    const addNote = useCallback(async (folderId: string, noteData?: Partial<Note>) => {
        if (!folderId) return null;
        try {
            let createdId: string | null = null;
            await database.write(async () => {
                const note = await database.get<DbNote>('notes').create(record => {
                    record.title = noteData?.title || 'Untitled';
                    record.preview = computePreview(noteData);
                    record.tag = noteData?.tag || 'General';
                    record.color = noteData?.color || '#fff';
                    record.isStarred = noteData?.isStarred || false;
                    record.updatedAt = Date.now();
                    record.folderId = folderId;
                    record.blocks = noteData?.blocks || [{ id: '1', type: 'text', content: '' }];
                });
                createdId = note.id;
            });
            return createdId;
        } catch (error) {
            console.error("Error adding note:", error);
            return null;
        }
    }, []);

    const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
        if (!noteId) return;
        try {
            console.log('📝 Updating note in DB:', noteId, updates);
            await database.write(async () => {
                const note = await database.get<DbNote>('notes').find(noteId);
                await note.update(record => {
                    if (updates.title !== undefined) record.title = updates.title;
                    if (updates.preview !== undefined) record.preview = updates.preview;
                    if (updates.tag !== undefined) record.tag = updates.tag;
                    if (updates.color !== undefined) record.color = updates.color;
                    if (updates.blocks !== undefined) {
                        record.blocks = updates.blocks;
                    }
                    if (updates.isStarred !== undefined) record.isStarred = updates.isStarred;
                    record.updatedAt = Date.now();
                });
            });
            console.log('✅ Note updated in DB successfully');
        } catch (error: any) {
            if (error?.message?.includes('not found')) {
                console.warn("Update skipped: Note not found (likely deleted).");
            } else {
                console.error("Error updating note:", error);
            }
        }
    }, []);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!noteId) return;
        try {
            await database.write(async () => {
                const note = await database.get<DbNote>('notes').find(noteId);
                await note.destroyPermanently();
            });
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    }, []);

    const getNote = useCallback((noteId: string) => {
        if (!noteId) return undefined;
        return notes.find(note => note.id === noteId);
    }, [notes]);

    return (
        <NotesContext.Provider value={{ folders, addFolder, deleteFolder, addNote, updateNote, deleteNote, getNote }}>
            {children}
        </NotesContext.Provider>
    );
};

export const useNotes = () => {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within a NotesProvider');
    }
    return context;
};
