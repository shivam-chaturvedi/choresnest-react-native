import { getDatabase } from '../database';
import { SupabaseService } from './SupabaseService';
import Member from '../database/models/Member';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';
import { SyncService } from './SyncService';

interface SupabaseSettingRecord {
  id: string;
  key: string;
  value: string | null;
  deleted?: boolean | null;
}

interface SupabaseMemberRecord {
  id: string;
  name: string;
  symbol: string;
  color: string;
  role?: string | null;
  deleted?: boolean | null;
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

  const writeMembers = async (profileId: string, remoteMembers: SupabaseMemberRecord[]) => {
    if (remoteMembers.length === 0) {
      return 0;
    }
  const now = Date.now();
  const membersCollection = getDatabase().collections.get<Member>('members');
  const existing = await membersCollection.query(
    Q.where('profile_id', profileId)
  ).fetch();
  const existingById = new Map(existing.map(record => [record.id, record]));
  await getDatabase().write(async () => {
    for (const remote of remoteMembers) {
      const isDeleted = remote.deleted ?? false;
      const local = existingById.get(remote.id);
      if (local) {
        await local.update(record => {
          record.name = remote.name;
          record.symbol = remote.symbol;
          record.color = remote.color;
          record.role = remote.role ?? '';
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
          record.deleted = isDeleted;
        });
      } else if (!isDeleted) {
        await membersCollection.create(member => {
          const raw = member._raw as any;
          raw.id = remote.id;
          member.profileId = profileId;
          member.name = remote.name;
          member.symbol = remote.symbol;
          member.color = remote.color;
          member.role = remote.role ?? '';
          member.isActive = false;
          member.createdAt = now;
          member.updatedAt = now;
          member.version = 1;
          member.deleted = false;
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
        const membersResponse = await SupabaseService.from('members')
          .select('id, name, symbol, color, role, deleted')
          .eq('profile_id', profileId);

        if (membersResponse.error) {
          console.warn('ProfileBootstrapService: failed to fetch members', membersResponse.error);
        } else if (membersResponse.data) {
          membersFetchSuccess = true;
          memberCount = await writeMembers(profileId, membersResponse.data as SupabaseMemberRecord[]);
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
