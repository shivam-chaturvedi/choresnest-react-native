import { database } from '../database';
import Member from '../database/models/Member';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import Document from '../database/models/Document';
import { ListItem } from '../database/models/List';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';
import { EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
import { SyncService } from './SyncService';

const OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted'];

const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const requireProfileId = (profileId?: string | null): string | null => {
  if (!profileId) {
    console.warn('FamilyService: profile_id missing for write operation');
    return null;
  }
  return profileId;
};

export const FamilyService = {
  observeMembers: (profileId?: string | null) => {
    if (!profileId) {
      return EMPTY;
    }
    return database.get<Member>('members').query(
      Q.where('profile_id', profileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    ).observeWithColumns(OBSERVE_COLUMNS);
  },

  observeFamilyName: (profileId?: string | null) => {
    if (!profileId) {
      return EMPTY;
    }
    return database
      .get<Setting>('settings')
      .query(
        Q.where('profile_id', profileId),
        Q.where('key', 'family_name'),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc)
      )
      .observeWithColumns(OBSERVE_COLUMNS)
      .pipe(map(records => (records.length > 0 ? records[0].value : 'Family Chores')));
  },

  setFamilyName: async (profileId: string | null | undefined, name: string) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      const settingsCollection = database.get<Setting>('settings');
      const records = await settingsCollection.query(
        Q.where('profile_id', effectiveProfileId),
        Q.where('key', 'family_name')
      ).fetch();

      if (records.length > 0) {
        await records[0].update(record => {
          record.value = name;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
          record.deleted = false;
        });
      } else {
        await settingsCollection.create(record => {
          record.profileId = effectiveProfileId;
          record.key = 'family_name';
          record.value = name;
          record.createdAt = now;
          record.updatedAt = now;
          record.version = 1;
          record.deleted = false;
        });
      }
    });
    syncAfterWrite();
  },

  addMember: async (profileId: string | null | undefined, name: string, symbol: string, color: string, isActive: boolean = false) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }

    const now = Date.now();
    await database.write(async () => {
      await database.get<Member>('members').create(member => {
        member.profileId = effectiveProfileId;
        member.name = name;
        member.symbol = symbol;
        member.color = color;
        member.role = '';
        member.isActive = isActive;
        member.createdAt = now;
        member.updatedAt = now;
        member.version = 1;
        member.deleted = false;
      });
    });
    syncAfterWrite();
  },

  updateMember: async (profileId: string | null | undefined, id: string, updates: Partial<Member>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      const member = await database.get<Member>('members').find(id);
      if (member.profileId !== effectiveProfileId) {
        return;
      }
      await member.update(record => {
        if (updates.name !== undefined) {
          record.name = updates.name;
        }
        if (updates.symbol !== undefined) {
          record.symbol = updates.symbol;
        }
        if (updates.color !== undefined) {
          record.color = updates.color;
        }
        if (updates.role !== undefined) {
          record.role = updates.role;
        }
        if (updates.isActive !== undefined) {
          record.isActive = updates.isActive;
        }
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  deleteMember: async (profileId: string | null | undefined, id: string) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      const member = await database.get<Member>('members').find(id);
      if (member.profileId !== effectiveProfileId) {
        return;
      }
      await member.update(record => {
        record.deleted = true;
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  setActiveMember: async (profileId: string | null | undefined, id: string) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      const members = await database.get<Member>('members').query(
        Q.where('profile_id', effectiveProfileId),
        Q.where('deleted', false)
      ).fetch();

      const updates = members.map(member =>
        member.prepareUpdate(record => {
          record.isActive = record.id === id;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
        })
      );

      if (updates.length > 0) {
        await database.batch(...updates);
      }
    });
    syncAfterWrite();
  },

  deleteMemberCascade: async (profileId: string | null | undefined, memberId: string) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();

    await database.write(async () => {
      const batchOps: any[] = [];
      const memberRecord = await database.get<Member>('members').find(memberId);
      if (memberRecord.profileId !== effectiveProfileId) {
        return;
      }

      batchOps.push(
        memberRecord.prepareUpdate(record => {
          record.deleted = true;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
        })
      );

      const taskRecords = await database.get<Task>('tasks').query(
        Q.where('assignee_id', memberId),
        Q.where('deleted', false),
        Q.where('profile_id', effectiveProfileId)
      ).fetch();
      batchOps.push(
        ...taskRecords.map(task =>
          task.prepareUpdate(record => {
            record.deleted = true;
            record.updatedAt = now;
            record.version = (record.version ?? 0) + 1;
          })
        )
      );

      const eventRecords = await database.get<Event>('events').query(
        Q.where('member_id', memberId),
        Q.where('deleted', false),
        Q.where('profile_id', effectiveProfileId)
      ).fetch();
      batchOps.push(
        ...eventRecords.map(event =>
          event.prepareUpdate(record => {
            record.deleted = true;
            record.updatedAt = now;
            record.version = (record.version ?? 0) + 1;
          })
        )
      );

      const documentRecords = await database.get<Document>('documents').query(
        Q.where('member_id', memberId),
        Q.where('deleted', false),
        Q.where('profile_id', effectiveProfileId)
      ).fetch();
      batchOps.push(
        ...documentRecords.map(document =>
          document.prepareUpdate((record: any) => {
            record.deleted = true;
            record.updatedAt = now;
            record.version = (record.version ?? 0) + 1;
          })
        )
      );

      const listItemRecords = await database.get<ListItem>('list_items').query(
        Q.where('added_by_id', memberId),
        Q.where('deleted', false),
        Q.where('profile_id', effectiveProfileId)
      ).fetch();
      batchOps.push(
        ...listItemRecords.map(item =>
          item.prepareUpdate(record => {
            record.deleted = true;
            record.updatedAt = now;
            record.version = (record.version ?? 0) + 1;
          })
        )
      );

      if (batchOps.length > 0) {
        await database.batch(...batchOps);
      }
    });

    syncAfterWrite();
  },
};
