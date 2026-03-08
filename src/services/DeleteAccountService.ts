import Config from 'react-native-config';

const DEFAULT_DELETE_ACCOUNT_FUNCTION_URL = 'https://rikhklhxcdhxykxxqvsc.supabase.co/functions/v1/delete-account';
const DELETE_ACCOUNT_FUNCTION_URL = ((Config.DELETE_ACCOUNT_FUNCTION_URL ?? DEFAULT_DELETE_ACCOUNT_FUNCTION_URL) || DEFAULT_DELETE_ACCOUNT_FUNCTION_URL).trim();

export const DeleteAccountService = {
    isConfigured() {
        return Boolean(DELETE_ACCOUNT_FUNCTION_URL);
    },

    async deleteAccountFromCloud({ userId, email }: { userId?: string; email?: string }) {
        if (!DELETE_ACCOUNT_FUNCTION_URL) {
            throw new Error('DELETE_ACCOUNT_FUNCTION_URL is not configured');
        }

        if (!userId && !email) {
            throw new Error('User identifier is missing');
        }

        const response = await fetch(DELETE_ACCOUNT_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId || null,
                email: email || null,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(body || 'Delete account request failed');
        }

        const result = await response.json().catch(() => ({}));

        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    },
};
