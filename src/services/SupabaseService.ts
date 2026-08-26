import { supabase } from '../config/supabase';
import { AuthError, PostgrestError, User, Session } from '@supabase/supabase-js';
import Config from 'react-native-config';

export interface SupabaseResponse<T = any> {
    data: T | null;
    error: PostgrestError | AuthError | null;
}

export class SupabaseService {
    private static logError(error: PostgrestError | AuthError | null, context: string) {
        if (error) {
            // Use console.warn (not console.error) so auth errors don't trigger
            // the React Native red error overlay — AuthContext already surfaces
            // a user-friendly toast for these failures.
            console.warn(`Supabase error [${context}]`, error.message ?? error.toString());
        }
    }
    /**
     * Auth Methods
     */
    static async getSession() {
        const result = await supabase.auth.getSession();
        this.logError(result.error ?? null, 'getSession');
        return result;
    }

    static async getUser() {
        const result = await supabase.auth.getUser();
        this.logError(result.error ?? null, 'getUser');
        return result;
    }

    static async signUp(email: string, pass: string, name: string) {
        // Use the HTTPS confirm-email URL in messages — custom schemes often break
        // in mail clients and some Supabase email pipelines.
        const redirectTo =
            'https://choresnest.com/confirm-email';
        const { data, error } = await supabase.auth.signUp({
            email,
            password: pass,
            options: {
                data: {
                    name: name,
                },
                emailRedirectTo: redirectTo,
            },
        });
        this.logError(error, 'signUp');
        if (!error) {
            console.log('[SupabaseService.signUp]', {
                email,
                hasSession: Boolean(data?.session),
                hasUser: Boolean(data?.user),
                identities: data?.user?.identities?.length ?? 0,
                confirmationSentAt: (data?.user as any)?.confirmation_sent_at ?? null,
                emailConfirmedAt: (data?.user as any)?.email_confirmed_at ?? null,
                redirectTo,
            });
        }
        return { data, error };
    }

    static async resendSignupConfirmation(email: string) {
        const redirectTo = 'https://choresnest.com/confirm-email';
        const result = await supabase.auth.resend({
            type: 'signup',
            email,
            options: {
                emailRedirectTo: redirectTo,
            },
        });
        this.logError(result.error ?? null, 'resendSignupConfirmation');
        return result;
    }

    static async signIn(email: string, pass: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: pass,
        });
        this.logError(error, 'signIn');
        return { data, error };
    }

    static async signOut() {
        const result = await supabase.auth.signOut();
        this.logError(result.error ?? null, 'signOut');
        return result;
    }

    static async resetPasswordForEmail(email: string) {
        const callbackUrl = "https://choresnest.com/reset-password";
        const result = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: callbackUrl,
        });
        this.logError(result.error ?? null, 'resetPasswordForEmail');
        return result;
    }

    static async updateProfile(userId: string, updates: { name?: string; color?: string; icon?: string; locale?: string }) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        this.logError(error, 'updateProfile');
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
            this.logError(error, 'checkConnection');
            if (error) {
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
