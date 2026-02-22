import { database } from '../database';
import { List, ListCategory, ListItem } from '../database/models/List';
import { SyncService } from './SyncService';
import { Q } from '@nozbe/watermelondb';
import { map } from 'rxjs/operators';
import { supabase } from '../config/supabase';

const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const fetchActiveProfileId = async (): Promise<string | null> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      console.warn('ListService: Unable to resolve profile for list item write', error);
      return null;
    }
    if (!session?.user) {
      return null;
    }
    return session.user.id;
  } catch (error) {
    console.error('ListService: Failed to read profile for list item write', error);
    return null;
  }
};

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
  categoryId: item.categoryId,
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

const serializeListCategoryRecord = (category: ListCategory) => ({
  id: category.id,
  name: category.name,
  icon: category.icon,
  color: category.color,
  profileId: category.profileId,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  version: category.version,
  deleted: category.deleted,
});

export type ListRecord = ReturnType<typeof serializeListRecord>;
export type ListItemRecord = ReturnType<typeof serializeListItemRecord>;
export type ListCategoryRecord = ReturnType<typeof serializeListCategoryRecord>;

type GroceryItemPayload = Partial<ListItem> & { addedBy?: string };
type ListPayload = { name: string; type: string; icon?: string };
type ListUpdates = Partial<{ name: string; type: string; icon?: string }>;
type CategoryPayload = { name: string; icon?: string; color?: string };
type CategoryUpdates = Partial<{ name: string; icon: string; color: string }>;

export const ListService = {
  observeLists: (profileId?: string | null) => {
    const effectiveProfileId = profileId ?? '';
    const query = database.get<List>('lists').query(
      Q.where('profile_id', effectiveProfileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    );
    return query.observeWithColumns(LIST_OBSERVE_COLUMNS).pipe(
      map(records => records.map(serializeListRecord))
    );
  },

  observeShoppingListItems: (profileId?: string | null) => {
    const effectiveProfileId = profileId ?? '';
    const query = database.get<ListItem>('list_items').query(
      Q.where('profile_id', effectiveProfileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    );
    return query.observeWithColumns(LIST_OBSERVE_COLUMNS).pipe(
      map(records => records.map(serializeListItemRecord))
    );
  },

  observeCategories: (profileId?: string | null) => {
    const effectiveProfileId = profileId ?? '';
    const query = database.get<ListCategory>('list_categories').query(
      Q.where('profile_id', effectiveProfileId),
      Q.where('deleted', false),
      Q.sortBy('updated_at', Q.desc)
    );
    return query.observeWithColumns(LIST_OBSERVE_COLUMNS).pipe(
      map(records => records.map(serializeListCategoryRecord))
    );
  },

  addGroceryItem: async (data: GroceryItemPayload) => {
    const profileId = await fetchActiveProfileId();
    if (!profileId) {
      console.warn('Skipping grocery write until profile is known');
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      const listsCollection = database.get<List>('lists');
      const groceryLists = await listsCollection.query(
        Q.where('profile_id', profileId),
        Q.where('type', 'grocery'),
        Q.where('deleted', false)
      ).fetch();
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

      await database.get<ListItem>('list_items').create(item => {
        const addedById = data.addedBy || data.addedById || 'system';
        item.profileId = profileId;
        item.listId = groceryListId!;
        item.name = data.name || 'Item';
        item.quantity = data.quantity ?? 1;
        item.unit = data.unit || 'pcs';
        if (data.categoryId) {
          item.categoryId = data.categoryId;
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
    await database.write(async () => {
      const item = await database.get<ListItem>('list_items').find(id);
      const nextState = !item.isCompleted;
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
    await database.write(async () => {
      const item = await database.get<ListItem>('list_items').find(id);
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
    await database.write(async () => {
      await database.get<List>('lists').create(list => {
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
    await database.write(async () => {
      const list = await database.get<List>('lists').find(id);
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
    await database.write(async () => {
      const list = await database.get<List>('lists').find(id);
      await list.update(record => {
        record.deleted = true;
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  addCategory: async (data: CategoryPayload) => {
    const profileId = await fetchActiveProfileId();
    if (!profileId) {
      console.warn('Skipping category create until profile is known');
      return;
    }
    const now = Date.now();
    await database.write(async () => {
      await database.get<ListCategory>('list_categories').create(category => {
        category.profileId = profileId;
        category.name = data.name;
        category.icon = data.icon || 'tag';
        category.color = data.color || '#9CA3AF';
        category.createdAt = now;
        category.updatedAt = now;
        category.version = 1;
        category.deleted = false;
      });
    });
    syncAfterWrite();
  },

  updateCategory: async (id: string, updates: CategoryUpdates) => {
    const now = Date.now();
    await database.write(async () => {
      const category = await database.get<ListCategory>('list_categories').find(id);
      await category.update(record => {
        if (updates.name !== undefined) {
          record.name = updates.name;
        }
        if (updates.icon !== undefined) {
          record.icon = updates.icon;
        }
        if (updates.color !== undefined) {
          record.color = updates.color;
        }
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },

  deleteCategory: async (id: string) => {
    const now = Date.now();
    await database.write(async () => {
      const category = await database.get<ListCategory>('list_categories').find(id);
      await category.update(record => {
        record.deleted = true;
        record.updatedAt = now;
        record.version = (record.version ?? 0) + 1;
      });
    });
    syncAfterWrite();
  },
};
