import { database } from '../database';
import Task from '../database/models/Task';
import { supabase } from '../config/supabase';

export const pushTaskToSupabase = async (taskId: string): Promise<void> => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('Instant task push skipped: user not authenticated', authError);
            return;
        }

        let task: Task;
        try {
            task = await database.get<Task>('tasks').find(taskId);
        } catch (findError) {
            console.warn('Instant task push skipped: task no longer exists', taskId);
            return;
        }

        const updatedAt = task.updatedAt ?? Date.now();

        const payload = {
            id: task.id,
            name: task.name,
            icon: task.icon,
            status: task.status,
            priority: task.priority,
            date: task.dateString,
            due_display: task.dueDisplay,
            assignee_id: task.assigneeId,
            tab: task.tab,
            reminder_enabled: task.reminderEnabled,
            updated_at: new Date(updatedAt).toISOString(),
            profile_id: user.id,
        };
        if (task.createdAt) {
            payload.created_at = new Date(task.createdAt).toISOString();
        }

        console.log('⚡ Instant task push', task.id);
        const { error } = await supabase.from('tasks').upsert(payload);
        if (error) {
            console.error('❌ Instant task push failed', error);
        }
    } catch (error) {
        console.error('❌ Instant task push failed', error);
    }
};
