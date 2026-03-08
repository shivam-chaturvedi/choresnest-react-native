import { getDatabase } from '../database';
import { List, ListItem } from '../database/models/List';
import { SyncService } from './SyncService';
import { Q } from '@nozbe/watermelondb';
import { map } from 'rxjs/operators';
import { supabase } from '../config/supabase';
import { ProfileService } from './ProfileService';

const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const fetchActiveProfileId = ProfileService.getActiveProfileId;

const LIST_OBSERVE_COLUMNS: string[] = ['updated_at', 'deleted'];

const serializeListRecord = (list: List) => ({
  id: list.id,
  name: list.name,
  type: list.type,
  icon: list.icon,
  profileId: list.profileId,
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
  version: list.version,
  deleted: list.deleted,
});

const serializeListItemRecord = (item: ListItem) => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  unit: item.unit,
  category: item.category,
  addedById: item.addedById,
  isCompleted: item.isCompleted,
  purchasedAt: item.purchasedAt,
  listId: item.listId,
  profileId: item.profileId,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  version: item.version,
  deleted: item.deleted,
});

export type ListRecord = ReturnType<typeof serializeListRecord>;
export type ListItemRecord = ReturnType<typeof serializeListItemRecord>;

type GroceryItemPayload = Partial<ListItem> & { addedBy?: string };
type ListPayload = { name: string; type: string; icon?: string };
type ListUpdates = Partial<{ name: string; type: string; icon?: string }>;

export const ListService = {
  observeLists: (profileId?: string | null) => {
    const effectiveProfileId = profileId ?? '';
    const query = getDatabase()
      .get<List>('lists')
      .query(
        Q.where('profile_id', effectiveProfileId),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc),
      );
    return query
      .observeWithColumns(LIST_OBSERVE_COLUMNS)
      .pipe(map(records => records.map(serializeListRecord)));
  },

  observeShoppingListItems: (profileId?: string | null) => {
    const effectiveProfileId = profileId ?? '';
    const query = getDatabase()
      .get<ListItem>('list_items')
      .query(
        Q.where('profile_id', effectiveProfileId),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc),
      );
    return query
      .observeWithColumns(LIST_OBSERVE_COLUMNS)
      .pipe(map(records => records.map(serializeListItemRecord)));
  },

  addGroceryItem: async (data: GroceryItemPayload) => {
    const profileId = await fetchActiveProfileId();
    if (!profileId) {
      console.warn('Skipping grocery write until profile is known');
      return;
    }
    const now = Date.now();
    const addedById = data.addedBy || data.addedById || 'system';
    let resolvedGroceryListId: string | undefined;
    await getDatabase().write(async () => {
      const listsCollection = getDatabase().get<List>('lists');
      const groceryLists = await listsCollection
        .query(
          Q.where('profile_id', profileId),
          Q.where('type', 'grocery'),
          Q.where('deleted', false),
        )
        .fetch();
      let groceryListId = groceryLists[0]?.id;
      if (!groceryListId) {
        const created = await listsCollection.create(list => {
          list.profileId = profileId;
          list.name = 'Grocery';
          list.type = 'grocery';
          list.icon = 'shoppingCart';
          list.createdAt = now;
          list.updatedAt = now;
          list.version = 1;
          list.deleted = false;
        });
        groceryListId = created.id;
      }
      resolvedGroceryListId = groceryListId;

      await getDatabase()
        .get<ListItem>('list_items')
        .create(item => {
          item.profileId = profileId;
          item.listId = groceryListId!;
          item.name = data.name || 'Item';
          item.quantity = data.quantity ?? 1;
          item.unit = data.unit || 'pcs';
          if (data.category) {
            item.category = data.category;
          }
          item.addedById = addedById;
          item.isCompleted = data.isCompleted ?? false;
          if (data.purchasedAt) {
            item.purchasedAt = data.purchasedAt;
          }
          item.createdAt = now;
          item.updatedAt = now;
          item.version = 1;
          item.deleted = false;
        });
    });
    syncAfterWrite();
  },

  toggleGroceryItem: async (id: string) => {
    const now = Date.now();
    let nextState = false;
    await getDatabase().write(async () => {
      const item = await getDatabase().get<ListItem>('list_items').find(id);
      nextState = !item.isCompleted;
      await item.update(i => {
        i.isCompleted = nextState;
        i.purchasedAt = nextState ? now : undefined;
        i.updatedAt = now;
        i.version = (i.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  removeGroceryItem: async (id: string) => {
    const now = Date.now();
    await getDatabase().write(async () => {
      const item = await getDatabase().get<ListItem>('list_items').find(id);
      await item.update(i => {
        i.deleted = true;
        i.updatedAt = now;
        i.version = (i.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  addList: async (data: ListPayload) => {
    const profileId = await fetchActiveProfileId();
    if (!profileId) {
      console.warn('Skipping list create until profile is known');
      return;
    }
    const now = Date.now();
    await getDatabase().write(async () => {
      await getDatabase()
        .get<List>('lists')
        .create(list => {
          list.profileId = profileId;
          list.name = (data.name || 'List').trim();
          list.type = data.type;
          list.icon = data.icon || 'list';
          list.createdAt = now;
          list.updatedAt = now;
          list.version = 1;
          list.deleted = false;
        });
    });
    syncAfterWrite();
  },

  updateList: async (id: string, updates: ListUpdates) => {
    const now = Date.now();
    await getDatabase().write(async () => {
      const list = await getDatabase().get<List>('lists').find(id);
      await list.update(record => {
        if (updates.name !== undefined) {
          record.name = updates.name;
        }
        if (updates.type !== undefined) {
          record.type = updates.type;
        }
        if (updates.icon !== undefined) {
          record.icon = updates.icon;
        }
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  deleteList: async (id: string) => {
    const now = Date.now();
    await getDatabase().write(async () => {
      const list = await getDatabase().get<List>('lists').find(id);
      await list.update(record => {
        record.deleted = true;
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },
};
