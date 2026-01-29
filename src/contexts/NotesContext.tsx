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
        const subscription = collection.query().observe().subscribe({
            next: (records) => {
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
        const candidate = noteData?.blocks?.find(block => block.content?.trim());
        if (candidate && candidate.content) {
            return candidate.content.trim().slice(0, 80);
        }
        if (noteData?.preview) return noteData.preview;
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
        } catch (error) {
            console.error("Error updating note:", error);
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
