import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import Task from '../database/models/Task';
import Event from '../database/models/Event';
import { Recipe } from '../database/models/Recipe';
import Document from '../database/models/Document';

export const SearchService = {
    search: async (query: string) => {
        if (!query || query.length < 2) return { tasks: [], events: [], recipes: [], documents: [] };

        try {
            const sanitizer = Q.sanitizeLikeString(query);
            const searchCondition = Q.where('name', Q.like(`%${sanitizer}%`));
            const titleCondition = Q.where('title', Q.like(`%${sanitizer}%`));

            const tasks = await database.get<Task>('tasks').query(searchCondition).fetch();
            const events = await database.get<Event>('events').query(titleCondition).fetch();
            const recipes = await database.get<Recipe>('recipes').query(searchCondition).fetch();
            const documents = await database.get<Document>('documents').query(searchCondition).fetch();

            return {
                tasks,
                events,
                recipes,
                documents
            };
        } catch (error) {
            console.error('Error searching:', error);
            return { tasks: [], events: [], recipes: [], documents: [] };
        }
    }
};
