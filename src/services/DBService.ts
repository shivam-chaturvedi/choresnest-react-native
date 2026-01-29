import { database } from '../database';

class DatabaseService {
    async init() {
        try {
            // Perform a lightweight check to ensure database is ready
            // We can query a simple table or just access the adapter
            await database.adapter.getLocal("db_version");
            console.log("Database service initialized successfully");
        } catch (error) {
            console.error("Failed to initialize database service:", error);
            // Optional: Logic to reset DB if completely corrupt
            // await database.unsafeResetDatabase(); 
            throw error;
        }
    }

    // Add any other global DB helper methods here
}

export const databaseService = new DatabaseService();
