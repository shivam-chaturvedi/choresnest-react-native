import { database } from '../database';
import { Folder as DbFolder, Note as DbNote } from '../database/models/Note';
import { supabase } from '../config/supabase';

export const pushNoteToSupabase = async (noteId: string): Promise<void> => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('Instant note push skipped: user not authenticated', authError);
            return;
        }

        let note: DbNote;
        try {
            note = await database.get<DbNote>('notes').find(noteId);
        } catch (findError) {
            console.warn('Instant note push skipped: note no longer exists', noteId);
            return;
        }
        const folderCollection = database.get<DbFolder>('folders');
        try {
            const folder = await folderCollection.find(note.folderId);
            await supabase.from('folders').upsert({
                id: folder.id,
                profile_id: user.id,
                title: folder.title,
                icon: folder.icon,
            });
        } catch (folderError) {
            console.warn('Instant note push: failed to sync folder', folderError);
        }
        const blocks = Array.isArray(note.blocks) ? note.blocks : [];

        const payload = {
            id: note.id,
            title: note.title,
            preview: note.preview,
            tag: note.tag || 'General',
            color: note.color,
            created_at: note.createdAt
                ? new Date(note.createdAt).toISOString()
                : new Date().toISOString(),
            updated_at: new Date(note.updatedAt ?? Date.now()).toISOString(),
            is_starred: Boolean(note.isStarred),
            folder_id: note.folderId,
            blocks_json: JSON.stringify(blocks),
            profile_id: user.id,
        };

        console.log('⚡ Instant note push', note.id);
        const { error } = await supabase.from('notes').upsert(payload);
        if (error) {
            console.error('❌ Instant note push failed', error);
        }
    } catch (error) {
        console.error('❌ Instant note push failed', error);
    }
};
