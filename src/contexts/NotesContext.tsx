import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { database } from '../database';
import { Folder as DbFolder, Note as DbNote } from '../database/models/Note';
import { Q } from '@nozbe/watermelondb';
import { SyncService } from '../services/SyncService';
import { supabase } from '../config/supabase';

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
    preview: string;
    tag: string;
    color: string;
    updatedAt: number;
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
    const [profileId, setProfileId] = useState<string | null>(null);
    const syncAfterWrite = useCallback(() => {
        void SyncService.requestSyncSoon();
    }, []);

    const folders = useMemo(() => {
        return folderMeta.map(folder => ({
            ...folder,
            notes: notes.filter(note => note.folderId === folder.id),
        }));
    }, [folderMeta, notes]);

    useEffect(() => {
        let mounted = true;
        const refreshProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (mounted) {
                    setProfileId(user?.id ?? null);
                }
            } catch (error) {
                console.warn('NotesContext: Failed to read profile id', error);
                if (mounted) {
                    setProfileId(null);
                }
            }
        };
        refreshProfile();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            setProfileId(session?.user?.id ?? null);
        });
        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const ensureDefaultFolder = useCallback(async () => {
        if (!profileId) {
            return;
        }
        try {
            const collection = database.get<DbFolder>('folders');
            const existing = await collection
                .query(
                    Q.where('profile_id', profileId),
                    Q.where('deleted', false)
                )
                .fetch();
            if (existing.length === 0) {
                let createdDefault = false;
                await database.write(async () => {
                    const now = Date.now();
                    await collection.create(folder => {
                        folder.title = 'Notes';
                        folder.icon = 'file';
                        folder.profileId = profileId;
                        folder.deleted = false;
                        folder.createdAt = now;
                        folder.updatedAt = now;
                        folder.version = 1;
                    });
                    createdDefault = true;
                });
                if (createdDefault) {
                    syncAfterWrite();
                }
            }
        } catch (error) {
            console.error("Failed to ensure notes folder:", error);
        }
    }, [profileId, syncAfterWrite]);

    useEffect(() => {
        if (!profileId) {
            setFolderMeta([]);
            setNotes([]);
            return;
        }
        ensureDefaultFolder();
    }, [profileId, ensureDefaultFolder]);

    useEffect(() => {
        if (!profileId) {
            setFolderMeta([]);
            return;
        }
        const collection = database.get<DbFolder>('folders');
        const subscription = collection
            .query(
                Q.where('profile_id', profileId),
                Q.where('deleted', false)
            )
            .observe()
            .subscribe({
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
    }, [profileId, syncAfterWrite]);

    useEffect(() => {
        if (!profileId) {
            setNotes([]);
            return;
        }
        const collection = database.get<DbNote>('notes');
        const subscription = collection
            .query(
                Q.where('profile_id', profileId),
                Q.where('deleted', false),
                Q.sortBy('updated_at', Q.desc)
            )
            .observeWithColumns(['title', 'preview', 'is_starred', 'updated_at', 'blocks_json'])
            .subscribe({
                next: (records) => {
                    console.log(`📥 NotesContext: Received ${records.length} notes update`);
                    const mapped = records
                        .map(record => {
                            const safeUpdatedAt = typeof record.updatedAt === 'number' ? record.updatedAt : Date.now();
                            const safeBlocks = Array.isArray(record.blocks) ? record.blocks : [];
                            return {
                                id: record.id,
                                title: record.title,
                                preview: record.preview || 'No content',
                                tag: record.tag || 'General',
                                color: record.color,
                                updatedAt: safeUpdatedAt,
                                blocks: safeBlocks,
                                isStarred: record.isStarred,
                                folderId: record.folderId,
                            };
                        })
                        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    setNotes(mapped);
                },
                error: (error) => console.error("Notes subscription failed", error),
            });
        return () => subscription.unsubscribe();
    }, [profileId]);

    const addFolder = useCallback(async (title: string) => {
        try {
            if (!title) return;
            if (!profileId) {
                console.warn('Skipping folder create until profile is known');
                return;
            }
            await database.write(async () => {
                const collection = database.get<DbFolder>('folders');
                const now = Date.now();
                await collection.create(folder => {
                    folder.title = title;
                    folder.icon = 'folder';
                    folder.profileId = profileId;
                    folder.deleted = false;
                    folder.createdAt = now;
                    folder.updatedAt = now;
                    folder.version = 1;
                });
            });
            syncAfterWrite();
        } catch (error) {
            console.error("Error adding folder:", error);
        }
    }, [profileId, syncAfterWrite]);

    const deleteFolder = useCallback(async (id: string) => {
        if (!id) return;
        if (!profileId) {
            console.warn('Skipping folder delete until profile is known');
            return;
        }
        try {
            await database.write(async () => {
                const notesCollection = database.get<DbNote>('notes');
                const folderNotes = await notesCollection
                    .query(
                        Q.where('folder_id', id),
                        Q.where('profile_id', profileId),
                        Q.where('deleted', false)
                    )
                    .fetch();
                const now = Date.now();
                await Promise.all(
                    folderNotes.map(note =>
                        note.update(n => {
                            n.deleted = true;
                            n.updatedAt = now;
                            n.version = (n.version ?? 0) + 1;
                        })
                    )
                );
                const folder = await database.get<DbFolder>('folders').find(id);
                await folder.update(f => {
                    f.deleted = true;
                    f.updatedAt = now;
                    f.version = (f.version ?? 0) + 1;
                });
            });
            syncAfterWrite();
        } catch (error) {
            console.error("Error deleting folder:", error);
        }
    }, [profileId, syncAfterWrite]);

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
        if (!profileId) {
            console.warn('Skipping note create until profile is known');
            return null;
        }
        try {
            let createdId: string | null = null;
            await database.write(async () => {
                const now = Date.now();
                const note = await database.get<DbNote>('notes').create(record => {
                    record.title = noteData?.title || 'Untitled';
                    record.preview = computePreview(noteData);
                    record.tag = noteData?.tag || 'General';
                    record.color = noteData?.color || '#fff';
                    record.isStarred = noteData?.isStarred || false;
                    record.updatedAt = now;
                    record.createdAt = now;
                    record.folderId = folderId;
                    record.profileId = profileId;
                    record.deleted = false;
                    record.version = 1;
                    record.blocks = noteData?.blocks || [{ id: '1', type: 'text', content: '' }];
                });
                createdId = note.id;
            });
            if (createdId) {
                syncAfterWrite();
            }
            return createdId;
        } catch (error) {
            console.error("Error adding note:", error);
            return null;
        }
    }, [profileId]);

    const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
        if (!noteId) return;
        try {
            console.log('📝 Updating note in DB:', noteId, updates);
            await database.write(async () => {
                const note = await database.get<DbNote>('notes').find(noteId);
                const now = Date.now();
                await note.update(record => {
                    if (updates.title !== undefined) record.title = updates.title;
                    if (updates.preview !== undefined) record.preview = updates.preview;
                    if (updates.tag !== undefined) record.tag = updates.tag;
                    if (updates.color !== undefined) record.color = updates.color;
                    if (updates.blocks !== undefined) {
                        record.blocks = updates.blocks;
                    }
                    if (updates.isStarred !== undefined) record.isStarred = updates.isStarred;
                    record.updatedAt = now;
                    record.version = (record.version ?? 0) + 1;
                });
            });
            syncAfterWrite();
            console.log('✅ Note updated in DB successfully');
        } catch (error: any) {
            if (error?.message?.includes('not found')) {
                console.warn("Update skipped: Note not found (likely deleted).");
            } else {
                console.error("Error updating note:", error);
            }
        }
    }, [syncAfterWrite]);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!noteId) return;
        try {
            await database.write(async () => {
                const note = await database.get<DbNote>('notes').find(noteId);
                const now = Date.now();
                await note.update(record => {
                    record.deleted = true;
                    record.updatedAt = now;
                    record.version = (record.version ?? 0) + 1;
                });
            });
            syncAfterWrite();
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    }, [syncAfterWrite]);

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

// Acceptance Checklist:
// - Device A creates/updates/deletes folders/notes for a profile; Device B receives each tombstoned change via SyncService.requestSyncSoon() without duplicate-create warnings.
// - Switch to another profile; local folders/notes clear and only that profile's data appears after sync, proving profile-aware defaults and pull handling.
