import { supabase } from '../config/supabase';
import { PostgrestError, User, Session } from '@supabase/supabase-js';

export interface SupabaseResponse<T = any> {
    data: T | null;
    error: PostgrestError | null;
}

export class SupabaseService {
    /**
     * Auth Methods
     */
    static async getSession() {
        return await supabase.auth.getSession();
    }

    static async getUser() {
        return await supabase.auth.getUser();
    }

    static async signUp(email: string, pass: string, name: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    full_name: name,
                },
            },
        });
        return { data, error };
    }

    static async signIn(email: string, pass: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        return { data, error };
    }

    static async signOut() {
        return await supabase.auth.signOut();
    }

    static async resetPasswordForEmail(email: string) {
        return await supabase.auth.resetPasswordForEmail(email);
    }

    static async updateProfile(userId: string, updates: { full_name?: string; color?: string; icon?: string; locale?: string }) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        return { data, error };
    }

    /**
     * Database Methods (Example generic wrapper)
     */
    static from(table: string) {
        return supabase.from(table);
    }

    // Check connection/health
    static async checkConnection(): Promise<boolean> {
        try {
            const { data, error } = await supabase.from('members').select('count', { count: 'exact', head: true });
            if (error) {
                // If the table doesn't exist, it might still throw, but that means we connected. 
                // We can also just check auth health.
                console.warn("Supabase check connection warning:", error.message);
                return false;
            }
            return true;
        } catch (e) {
            console.error("Supabase check connection failed:", e);
            return false;
        }
    }
}
