import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
}

export interface Folder {
    id: string;
    title: string;
    icon: string;
    notes: Note[];
}

interface NotesContextType {
    folders: Folder[];
    addFolder: (title: string) => void;
    deleteFolder: (id: string) => void;
    addNote: (folderId: string, note?: Partial<Note>) => void;
    updateNote: (noteId: string, updates: Partial<Note>) => void;
    deleteNote: (noteId: string) => void;
    getNote: (noteId: string) => Note | undefined;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const STORAGE_KEY = '@familychore:notes_data_v1';

const initialFolders: Folder[] = [
    {
        id: "f1",
        title: "Personal",
        icon: "user",
        notes: [
            {
                id: "1",
                title: "Grocery List Ideas",
                preview: "Milk, almond butter...",
                tag: "Personal",
                color: "#FEF3C7",
                updatedAt: new Date().toISOString(),
                blocks: [
                    { id: 'b1', type: 'text', content: 'Milk' },
                    { id: 'b2', type: 'text', content: 'Almond Butter' },
                ]
            },
        ]
    },
    {
        id: "f2",
        title: "Work Projects",
        icon: "briefcase",
        notes: []
    },
];

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [folders, setFolders] = useState<Folder[]>(initialFolders);

    // Load from storage
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(json => {
            if (json) {
                setFolders(JSON.parse(json));
            }
        });
    }, []);

    // Save to storage
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
    }, [folders]);

    const addFolder = (title: string) => {
        const newFolder: Folder = {
            id: Date.now().toString(),
            title,
            icon: 'folder',
            notes: []
        };
        setFolders(prev => [...prev, newFolder]);
    };

    const deleteFolder = (id: string) => {
        setFolders(prev => prev.filter(f => f.id !== id));
    };

    const addNote = (folderId: string, noteData?: Partial<Note>) => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: noteData?.title || 'Untitled',
            preview: noteData?.preview || 'No content',
            tag: 'General',
            color: '#fff',
            updatedAt: new Date().toISOString(),
            blocks: noteData?.blocks || [{ id: '1', type: 'text', content: '' }]
        };

        setFolders(prev => prev.map(folder => {
            if (folder.id === folderId) {
                return { ...folder, notes: [newNote, ...folder.notes] };
            }
            return folder;
        }));
    };

    const updateNote = (noteId: string, updates: Partial<Note>) => {
        setFolders(prev => prev.map(folder => ({
            ...folder,
            notes: folder.notes.map(note => {
                if (note.id === noteId) {
                    return { ...note, ...updates, updatedAt: new Date().toISOString() };
                }
                return note;
            })
        })));
    };

    const deleteNote = (noteId: string) => {
        setFolders(prev => prev.map(folder => ({
            ...folder,
            notes: folder.notes.filter(n => n.id !== noteId)
        })));
    };

    const getNote = (noteId: string) => {
        for (const folder of folders) {
            const note = folder.notes.find(n => n.id === noteId);
            if (note) return note;
        }
        return undefined;
    };

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
