import { getDatabase } from '../database';

class DatabaseService {
    async init() {
        try {
            const db = getDatabase();
            // Perform a lightweight check to ensure database is ready
            // We can query a simple table or just access the adapter
            await db.adapter.getLocal("db_version");
            console.log("Database service initialized successfully");
        } catch (error) {
            console.error("Failed to initialize database service:", error);
            throw error;
        }
    }
}

export const databaseService = new DatabaseService();
