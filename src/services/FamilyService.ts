import { getDatabase } from '../database';
import User from '../database/models/User';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import Document from '../database/models/Document';
import { ListItem } from '../database/models/List';
import Setting from '../database/models/Setting';
import { Q } from '@nozbe/watermelondb';
import { EMPTY, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SyncService } from './SyncService';
import { uuidv4 } from '../utils/uuid';
import { getUsersCollection, resolveOwnerId } from './ownerHelper';

const OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted', 'value'];

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
    return from(resolveOwnerId(profileId)).pipe(
      switchMap(ownerId => {
        if (!ownerId) {
          return EMPTY;
        }
        return getUsersCollection()
          .query(
            Q.where('owner_id', ownerId),
            Q.where('deleted', false),
            Q.sortBy('updated_at', Q.desc)
          )
          .observeWithColumns(OBSERVE_COLUMNS);
      })
    );
  },

  observeFamilyName: (profileId?: string | null) => {
    if (!profileId) {
      return EMPTY;
    }
    return getDatabase()
      .get<Setting>('settings')
      .query(
        Q.where('profile_id', profileId),
        Q.where('key', 'family_name'),
        // Use notEq(true) rather than where('deleted', false) so that SQLite
        // integer 0 (the default for boolean false stored by WatermelonDB) is
        // also accepted — avoids missing rows that came in via a sync pull.
        Q.where('deleted', Q.notEq(true)),
        Q.sortBy('updated_at', Q.desc)
      )
      .observeWithColumns(OBSERVE_COLUMNS)
      .pipe(map(records => (records.length > 0 ? records[0].value : 'Chores Nest')));
  },

  setFamilyName: async (profileId: string | null | undefined, name: string) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await getDatabase().write(async () => {
      const settingsCollection = getDatabase().get<Setting>('settings');
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

    await getDatabase().write(async () => {
      const ownerId = await resolveOwnerId(effectiveProfileId);
      if (!ownerId) {
        console.warn('FamilyService: Unable to resolve owner_id for addMember');
        return;
      }
      await getUsersCollection().create(user => {
        const raw = user._raw as any;
        raw.id = uuidv4();
        user.name = name;
        user.symbol = symbol;
        user.color = color;
        user.role = 'member';
        user.isActive = isActive;
        user.ownerId = ownerId;
        user.deleted = false;
        user.version = 1;
        const now = Date.now();
        user.createdAt = now;
        user.updatedAt = now;
      });
    });
    syncAfterWrite();
  },

  updateMember: async (profileId: string | null | undefined, id: string, updates: Partial<User>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    await getDatabase().write(async () => {
      const member = await getUsersCollection().find(id);
      const ownerId = await resolveOwnerId(effectiveProfileId);
      if (ownerId && member.ownerId !== ownerId && member.id !== ownerId) {
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
    await getDatabase().write(async () => {
      const member = await getUsersCollection().find(id);
      const ownerId = await resolveOwnerId(effectiveProfileId);
      if (ownerId && member.ownerId !== ownerId && member.id !== ownerId) {
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
    await getDatabase().write(async () => {
      const ownerId = await resolveOwnerId(effectiveProfileId);
      if (!ownerId) {
        return;
      }
      const members = await getUsersCollection()
        .query(
          Q.where('owner_id', ownerId),
          Q.where('deleted', false)
        )
        .fetch();

      const updates = members.map(member =>
        member.prepareUpdate(record => {
          record.isActive = record.id === id;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
        })
      );

      if (updates.length > 0) {
        await getDatabase().batch(...updates);
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

    await getDatabase().write(async () => {
      const batchOps: any[] = [];
      const memberRecord = await getUsersCollection().find(memberId);
      const ownerId = await resolveOwnerId(effectiveProfileId);
      if (ownerId && memberRecord.ownerId !== ownerId && memberRecord.id !== ownerId) {
        return;
      }

      batchOps.push(
        memberRecord.prepareUpdate(record => {
          record.deleted = true;
          record.updatedAt = now;
          record.version = (record.version ?? 0) + 1;
        })
      );

      const taskRecords = await getDatabase().get<Task>('tasks').query(
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

      const eventRecords = await getDatabase().get<Event>('events').query(
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

      const documentRecords = await getDatabase().get<Document>('documents').query(
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

      const listItemRecords = await getDatabase().get<ListItem>('list_items').query(
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
        await getDatabase().batch(...batchOps);
      }
    });

    syncAfterWrite();
  },
};
