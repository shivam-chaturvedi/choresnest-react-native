import { getDatabase } from '../database';
import { Q } from '@nozbe/watermelondb';
import User from '../database/models/User';

export const getUsersCollection = () => getDatabase().get<User>('users');

export const resolveOwnerId = async (profileId?: string | null): Promise<string | null> => {
    if (!profileId) {
        return null;
    }
    try {
        const user = await getUsersCollection().find(profileId);
        if (!user) {
            return null;
        }
        if (user.role === 'member' && user.ownerId) {
            return user.ownerId;
        }
        return user.id;
    } catch (error) {
        console.warn('ownerHelper: failed to resolve owner_id', error);
        return null;
    }
};

export const queryFamilyUsers = (ownerId: string) =>
    getUsersCollection().query(
        Q.where('owner_id', ownerId),
        Q.where('deleted', false),
    );
