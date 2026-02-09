import { supabase } from '../config/supabase';

export interface PushBudgetOptions {
    recordId?: string;
    month?: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface PushBudgetResult {
    recordId: string;
    createdAt: number;
    month: string;
}

export const pushBudgetToSupabase = async (
    category: string,
    amount: number,
    options: PushBudgetOptions = {}
): Promise<PushBudgetResult | null> => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('Instant budget push skipped: user not authenticated', authError);
            return null;
        }

        const month = options.month ?? new Date().toISOString().slice(0, 7);
        const recordId = options.recordId ?? `${user.id}-${month}-${category}`;
        const createdAt = options.createdAt ?? Date.now();
        const updatedAt = options.updatedAt ?? Date.now();

        const payload = {
            id: recordId,
            category,
            amount,
            month,
            profile_id: user.id,
            created_at: new Date(createdAt).toISOString(),
            updated_at: new Date(updatedAt).toISOString(),
        };

        console.log('⚡ Instant budget push', category, month);
        const { error } = await supabase.from('budgets').upsert(payload);
        if (error) {
            console.error('❌ Instant budget push failed', error);
            return null;
        }

        return { recordId, createdAt, month };
    } catch (error) {
        console.error('❌ Instant budget push failed', error);
        return null;
    }
};
