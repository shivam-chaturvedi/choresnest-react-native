import { Platform } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import schema from './schema';
import migrations from './migrations';
import User from './models/User';
import Member from './models/Member';
import Setting from './models/Setting';
import AppSettings from './models/AppSettings';
import Event from './models/Event';
import Task from './models/Task';
import { List, ListItem, ListCategory } from './models/List';
import { Recipe, Collection, CollectionRecipe } from './models/Recipe';
import MealPlan from './models/MealPlan';
import Document from './models/Document';
import { Transaction, Budget } from './models/Finance';
import { Note, Folder } from './models/Note';
import NotificationPreference from './models/NotificationPreference';
import QuietHours from './models/QuietHours';
import AppLock from './models/AppLock';
import UserPreference from './models/UserPreference';

const adapter = new SQLiteAdapter({
    schema,
    migrations,
    dbName: 'family_chores',
    jsi: Platform.OS === 'ios',
    onSetUpError: error => {
        console.error('Database failed to load:', error);
    },
});

export const database = new Database({
    adapter,
    modelClasses: [
        User,
        Member,
        Setting,
        AppSettings,
        Event,
        Task,
        List,
        ListItem,
        ListCategory,
        Recipe,
        Collection,
        CollectionRecipe,
        MealPlan,
        Document,
        Transaction,
        Budget,
        Note,
        Folder,
        NotificationPreference,
        QuietHours,
        AppLock,
        UserPreference,
    ],
});
