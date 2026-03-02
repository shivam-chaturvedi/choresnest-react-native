import { getDatabase } from '../database';
import { Q } from '@nozbe/watermelondb';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import { Recipe } from '../database/models/Recipe';
import Document from '../database/models/Document';
import { ListItem } from '../database/models/List';

export const SearchService = {
    search: async (query: string, activeFilter?: string | null) => {
        if (!query) return { tasks: [], events: [], recipes: [], documents: [], groceries: [] };

        try {
            const sanitizer = Q.sanitizeLikeString(query);
            // Search dynamically to find matches containing or starting with the query
            // Q.like is case-insensitive in SQLite by default.
            const searchCondition = Q.where('name', Q.like(`%${sanitizer}%`));
            const titleCondition = Q.where('title', Q.like(`%${sanitizer}%`));
            const notDeleted = Q.where('deleted', Q.notEq(true));

            let tasks: Task[] = [];
            let events: Event[] = [];
            let recipes: Recipe[] = [];
            let documents: Document[] = [];
            let groceries: ListItem[] = [];

            if (!activeFilter || activeFilter === 'task') {
                tasks = await getDatabase().get<Task>('tasks').query(searchCondition, notDeleted).fetch();
            }
            if (!activeFilter || activeFilter === 'event') {
                events = await getDatabase().get<Event>('events').query(titleCondition, notDeleted).fetch();
            }
            if (!activeFilter || activeFilter === 'recipe') {
                recipes = await getDatabase().get<Recipe>('recipes').query(searchCondition, notDeleted).fetch();
            }
            if (!activeFilter || activeFilter === 'document') {
                documents = await getDatabase().get<Document>('documents').query(searchCondition, notDeleted).fetch();
            }
            if (!activeFilter || activeFilter === 'grocery') {
                groceries = await getDatabase().get<ListItem>('list_items').query(
                    searchCondition,
                    Q.where('is_completed', false),
                    notDeleted,
                    Q.on('lists', 'type', 'grocery') // Only grocery items
                ).fetch();
            }

            return {
                tasks,
                events,
                recipes,
                documents,
                groceries
            };
        } catch (error) {
            console.error('Error searching:', error);
            return { tasks: [], events: [], recipes: [], documents: [], groceries: [] };
        }
    }
};
