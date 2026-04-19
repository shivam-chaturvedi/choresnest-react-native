import { getDatabase } from '../database';
import { SupabaseService } from './SupabaseService';
import User from '../database/models/User';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';
import { SyncService } from './SyncService';

interface SupabaseSettingRecord {
  id: string;
  key: string;
  value: string | null;
  deleted?: boolean | null;
}

interface SupabaseProfileRecord {
  id: string;
  email?: string | null;
  name?: string | null;
  symbol?: string | null;
  color?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  owner_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted?: boolean | null;
  version?: number | null;
  active_profile_id?: string | null;
  is_guest?: boolean | null;
}

export interface ProfileBootstrapResult {
  familyName?: string;
  memberCount: number;
  hasMembers: boolean;
}

let lastProfileId: string | null = null;
let lastResult: ProfileBootstrapResult | null = null;
let pendingPromise: Promise<ProfileBootstrapResult> | null = null;

const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const getUsersCollection = () => getDatabase().collections.get<User>('users');

const writeFamilyName = async (profileId: string, familySetting: SupabaseSettingRecord) => {
  const now = Date.now();
  await getDatabase().write(async () => {
    const settingsCollection = getDatabase().collections.get<Setting>('settings');
    const existing = await settingsCollection.query(
      Q.where('profile_id', profileId),
      Q.where('key', 'family_name')
    ).fetch();
    const isDeleted = familySetting.deleted ?? false;
    if (existing.length > 0) {
      await existing[0].update(record => {
        record.value = familySetting.value ?? '';
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
        record.deleted = isDeleted;
      });
    } else if (!isDeleted) {
      await settingsCollection.create(record => {
        const raw = record._raw as any;
        raw.id = familySetting.id;
        record.profileId = profileId;
        record.key = 'family_name';
        record.value = familySetting.value ?? '';
        record.createdAt = now;
        record.updatedAt = now;
        record.version = 1;
        record.deleted = false;
      });
    }
  });
};

const writeProfiles = async (ownerId: string, remoteMembers: SupabaseProfileRecord[]) => {
  if (remoteMembers.length === 0) {
    return 0;
  }
  const now = Date.now();
  const usersCollection = getDatabase().collections.get<User>('users');
  const existing = await usersCollection.query(
    Q.where('owner_id', ownerId)
  ).fetch();
  const existingById = new Map(existing.map(record => [record.id, record]));
  await getDatabase().write(async () => {
    for (const remote of remoteMembers) {
      const isDeleted = remote.deleted ?? false;
      const local = existingById.get(remote.id);
      const createdAt = remote.created_at ? new Date(remote.created_at).getTime() : now;
      const updatedAt = remote.updated_at ? new Date(remote.updated_at).getTime() : now;
      if (local) {
        await local.update(record => {
          record.email = remote.email ?? record.email;
          record.name = remote.name ?? record.name;
          record.symbol = remote.symbol ?? record.symbol;
          record.color = remote.color ?? record.color;
          record.role = remote.role ?? record.role;
          record.isActive = remote.is_active ?? record.isActive;
          record.ownerId = remote.owner_id ?? ownerId;
          record.deleted = isDeleted;
          record.updatedAt = updatedAt;
          record.version = remote.version ?? (record.version ?? 0);
        });
      } else if (!isDeleted) {
        await usersCollection.create(user => {
          const raw = user._raw as any;
          raw.id = remote.id;
          user.email = remote.email ?? '';
          user.name = remote.name ?? '';
          user.symbol = remote.symbol ?? 'account';
          user.color = remote.color ?? 'member-blue';
          user.role = remote.role ?? 'member';
          user.isActive = remote.is_active ?? false;
          user.ownerId = remote.owner_id ?? ownerId;
          user.deleted = false;
          user.version = remote.version ?? 1;
          user.createdAt = createdAt;
          user.updatedAt = updatedAt;
          user.activeProfileId = remote.active_profile_id ?? '';
          user.isGuest = remote.is_guest ?? false;
        });
      }
    }
  });
  return remoteMembers.filter(member => !member.deleted).length;
};

export const ProfileBootstrapService = {
  async bootstrap(profileId: string): Promise<ProfileBootstrapResult> {
    if (!profileId) {
      return { memberCount: 0, hasMembers: false };
    }

    if (lastProfileId === profileId && lastResult) {
      return lastResult;
    }

    if (pendingPromise) {
      return pendingPromise;
    }

    pendingPromise = (async () => {
      lastProfileId = profileId;

      let familyName: string | undefined;
      let memberCount = 0;
      let hasMembers = false;
      let membersFetchSuccess = false;

      try {
        const settingsResponse = await SupabaseService.from('settings')
          .select('id, key, value, deleted')
          .eq('profile_id', profileId);

        if (settingsResponse.error) {
          console.warn('ProfileBootstrapService: failed to fetch settings', settingsResponse.error);
        } else if (settingsResponse.data) {
          const familySetting = settingsResponse.data.find((setting: SupabaseSettingRecord) => setting.key === 'family_name' && setting.value);
          if (familySetting) {
            try {
              await writeFamilyName(profileId, familySetting);
              familyName = familySetting.value ?? undefined;
            } catch (writeError) {
              console.error('ProfileBootstrapService: failed to write family name', writeError);
            }
          }
        }
      } catch (error) {
        console.error('ProfileBootstrapService: unexpected error while fetching settings', error);
      }

      try {
        let ownerId = profileId;
        const ownerResponse = await SupabaseService.from('profiles')
          .select('owner_id')
          .eq('id', profileId)
          .single();
        if (ownerResponse.data?.owner_id) {
          ownerId = ownerResponse.data.owner_id;
        }

        const profilesResponse = await SupabaseService.from('profiles')
          .select(
            'id, email, name, symbol, color, role, is_active, owner_id, created_at, updated_at, deleted, version, active_profile_id, is_guest'
          )
          .eq('owner_id', ownerId)
          .order('updated_at', { ascending: false });

        if (profilesResponse.error) {
          console.warn('ProfileBootstrapService: failed to fetch profiles', profilesResponse.error);
        } else if (profilesResponse.data) {
          membersFetchSuccess = true;
          memberCount = await writeProfiles(ownerId, profilesResponse.data as SupabaseProfileRecord[]);
          hasMembers = memberCount > 0;
        }
      } catch (error) {
        console.error('ProfileBootstrapService: unexpected error while fetching members', error);
      }

      const result: ProfileBootstrapResult & { membersFetchSuccess?: boolean } = {
        familyName,
        memberCount,
        hasMembers: hasMembers || memberCount > 0,
        membersFetchSuccess,
      };

      lastResult = result;
      pendingPromise = null;
      return result;
    })();

    return pendingPromise;
  },

  resetCache() {
    lastProfileId = null;
    lastResult = null;
    pendingPromise = null;
  },
};
