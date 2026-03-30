import { supabase } from '../config/supabase';

const INVITE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

export type InviteRecord = {
  id: string;
};

export const InviteService = {
  async createInvite(profileId: string, invitedBy: string): Promise<InviteRecord> {
    const expiresAt = new Date(Date.now() + INVITE_EXPIRATION_MS).toISOString();
    const { data, error } = await supabase
      .from('invites')
      .insert([
        {
          profile_id: profileId,
          invited_by: invitedBy,
          invitation_limit: 1,
          expires_at: expiresAt,
        },
      ])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data as InviteRecord;
  },
};
