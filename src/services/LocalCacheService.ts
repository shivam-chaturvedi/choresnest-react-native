import { database } from '../database';
import Document from '../database/models/Document';

let ready = false;
let ensurePromise: Promise<void> | null = null;

const preloadDocuments = async () => {
  const collection = database.collections.get<Document>('documents');
  await collection.query().fetch();
};

export const LocalCacheService = {
  async ensureReady() {
    if (ready) {
      return;
    }
    if (!ensurePromise) {
      ensurePromise = (async () => {
        try {
          await preloadDocuments();
        } catch (error) {
          console.warn('LocalCacheService: failed to read local document cache', error);
        } finally {
          ready = true;
        }
      })();
    }
    await ensurePromise;
  },
  isReady() {
    return ready;
  },
};
