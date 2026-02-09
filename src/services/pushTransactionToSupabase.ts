import { supabase } from '../config/supabase';

export interface PushTransactionPayload {
    id: string;
    name: string;
    amount: number;
    date: string;
    icon: string;
    type: 'income' | 'expense';
    category: string;
    createdAt?: number;
    updatedAt?: number;
}

export const pushTransactionToSupabase = async (transaction: PushTransactionPayload): Promise<void> => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.warn('Instant transaction push skipped: user not authenticated', authError);
            return;
        }

        const createdAtIso = transaction.createdAt
            ? new Date(transaction.createdAt).toISOString()
            : new Date().toISOString();

        const payload = {
            id: transaction.id,
            name: transaction.name,
            amount: transaction.amount,
            date: transaction.date,
            icon: transaction.icon,
            type: transaction.type,
            category: transaction.category,
            profile_id: user.id,
            created_at: createdAtIso,
            updated_at: new Date(transaction.updatedAt ?? Date.now()).toISOString(),
        };

        console.log('⚡ Instant transaction push', transaction.id);
        const { error } = await supabase.from('transactions').upsert(payload);
        if (error) {
            console.error('❌ Instant transaction push failed', error);
        }
    } catch (error) {
        console.error('❌ Instant transaction push failed', error);
    }
};
