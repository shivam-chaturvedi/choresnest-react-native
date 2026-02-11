import { database } from '../database';
import Event from '../database/models/Event';
import { supabase } from '../config/supabase';

export const pushEventToSupabase = async (eventId: string): Promise<void> => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('Instant event push skipped: user not authenticated', authError);
            return;
        }

        let event: Event;
        try {
            event = await database.get<Event>('events').find(eventId);
        } catch (findError) {
            console.warn('Instant event push skipped: event no longer exists', eventId);
            return;
        }
        const updatedAt = event.updatedAt ?? Date.now();

        const payload: any = {
            id: event.id,
            title: event.title,
            icon: event.icon,
            date: event.dateString,
            time: event.time,
            end_time: event.endTime,
            end_date: event.endDate,
            member_id: event.memberId,
            location: event.location,
            description: event.description,
            notes: event.notes,
            is_recurring: event.isRecurring,
            recurrence_rule: event.recurrenceRule,
            recurrence_end_date: event.recurrenceEndDate,
            reminder_offset_minutes: event.reminderOffsetMinutes,
            time_zone: event.timeZone,
            visibility: event.visibility,
            updated_at: new Date(updatedAt).toISOString(),
            profile_id: user.id,
        };
        if (event.createdAt) {
            payload.created_at = new Date(event.createdAt).toISOString();
        }

        console.log('⚡ Instant event push', event.id);
        const { error } = await supabase.from('events').upsert(payload);
        if (error) {
            console.error('❌ Instant event push failed', error);
        }
    } catch (error) {
        console.error('❌ Instant event push failed', error);
    }
};
