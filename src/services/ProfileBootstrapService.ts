import { database } from '../database';
import { SupabaseService } from './SupabaseService';
import Member from '../database/models/Member';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';

interface SupabaseSettingRecord {
  id: string;
  key: string;
  value: string | null;
}

interface SupabaseMemberRecord {
  id: string;
  name: string;
  symbol: string;
  color: string;
  role?: string | null;
  is_active?: boolean | null;
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

const writeFamilyName = async (familySetting: SupabaseSettingRecord) => {
  const settingsCollection = database.collections.get<Setting>('settings');
  const existing = await settingsCollection.query(Q.where('key', 'family_name')).fetch();

    await database.write(async () => {
      for (const record of existing) {
        await record.destroyPermanently();
      }
      await settingsCollection.create(setting => {
        const raw = setting._raw as any;
        raw.id = familySetting.id;
        setting.key = 'family_name';
        setting.value = familySetting.value ?? '';
      });
    });
};

const writeMembers = async (remoteMembers: SupabaseMemberRecord[]) => {
  if (remoteMembers.length === 0) {
    return 0;
  }

  const filtered = remoteMembers.filter(member => !member.deleted);
  if (filtered.length === 0) {
    return 0;
  }

  const membersCollection = database.collections.get<Member>('members');
    await database.write(async () => {
      const existing = await membersCollection.query().fetch();
      for (const record of existing) {
        await record.destroyPermanently();
      }

      for (const remote of filtered) {
        await membersCollection.create(member => {
          const raw = member._raw as any;
          raw.id = remote.id;
          member.name = remote.name;
          member.symbol = remote.symbol;
          member.color = remote.color;
          member.role = remote.role ?? '';
          member.isActive = remote.is_active ?? false;
        });
      }
    });

  return filtered.length;
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

      try {
        const settingsResponse = await SupabaseService.from('settings')
          .select('id, key, value')
          .eq('profile_id', profileId);

        if (settingsResponse.error) {
          console.warn('ProfileBootstrapService: failed to fetch settings', settingsResponse.error);
        } else if (settingsResponse.data) {
          const familySetting = settingsResponse.data.find((setting: SupabaseSettingRecord) => setting.key === 'family_name' && setting.value);
          if (familySetting) {
            try {
              await writeFamilyName(familySetting);
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
          .select('id, name, symbol, color, role, is_active, deleted')
          .eq('profile_id', profileId);

        if (membersResponse.error) {
          console.warn('ProfileBootstrapService: failed to fetch members', membersResponse.error);
        } else if (membersResponse.data) {
          memberCount = await writeMembers(membersResponse.data as SupabaseMemberRecord[]);
          hasMembers = memberCount > 0;
        }
      } catch (error) {
        console.error('ProfileBootstrapService: unexpected error while fetching members', error);
      }

      const result: ProfileBootstrapResult = {
        familyName,
        memberCount,
        hasMembers: hasMembers || memberCount > 0,
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
