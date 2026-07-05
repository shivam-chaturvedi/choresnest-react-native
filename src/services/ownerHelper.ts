import { getDatabase } from '../database';
import { Q } from '@nozbe/watermelondb';
import User from '../database/models/User';

export const getUsersCollection = () => getDatabase().get<User>('users');

export const resolveOwnerId = async (profileId?: string | null): Promise<string | null> => {
    if (!profileId) {
        return null;
    }
    try {
        // WatermelonDB treats `id` as a special primary key; using `find` is the
        // most reliable way to resolve it across adapters.
        const user = await getUsersCollection().find(profileId);
        if (user.role === 'member' && user.ownerId) {
            return user.ownerId;
        }
        return user.id;
    } catch (error) {
        // Record not found is expected when booting on a fresh DB; fall back to profileId.
        const message = (error as any)?.message ?? String(error);
        if (!message.includes('not found')) {
            console.warn('ownerHelper: failed to resolve owner_id', error);
        }
        return profileId;
    }
};

export const queryFamilyUsers = (ownerId: string) =>
    getUsersCollection().query(
        Q.where('owner_id', ownerId),
        Q.where('deleted', false),
    );
