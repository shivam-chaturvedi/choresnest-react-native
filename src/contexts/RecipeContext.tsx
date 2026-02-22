import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import { uuidv4 } from '../utils/uuid';
import { Recipe as RecipeType, RecipeCollection } from '../types/recipes';
import {
  Recipe as RecipeModel,
  Collection as CollectionModel,
  CollectionRecipe as CollectionRecipeModel,
} from '../database/models/Recipe';
import { SyncService } from '../services/SyncService';
import { supabase } from '../config/supabase';
import {
  IMAGE_BUCKET,
  AUDIO_BUCKET,
  getBucketPublicUrl,
} from '../services/StorageService';
import { DocumentUploadScheduler } from '../services/sync/DocumentUploadScheduler';

const OBSERVE_COLUMNS: string[] = [
  'updated_at',
  'deleted',
  'upload_status',
  'remote_image_paths',
  'remote_audio_path',
  'local_image_uris',
  'local_audio_uri',
  'upload_attempts',
  'last_upload_error',
];
const syncAfterWrite = () => {
  void SyncService.requestSyncSoon();
};

const requireProfileId = (profileId?: string | null): string | null => {
  if (!profileId) {
    console.warn('RecipeContext: profile_id missing for write operation');
    return null;
  }
  return profileId;
};

const logError = (context: string, error: unknown) => {
  console.error(`RecipeContext: ${context}`, error);
};

const sanitizeImageInputs = (images?: string[] | null): string[] => {
  if (!images) {
    return [];
  }
  return images
    .map((uri) => uri?.trim())
    .filter((uri): uri is string => !!uri);
};

const toStringArray = (value?: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : undefined))
    .filter((item): item is string => Boolean(item));
};

const normalizeOptionalString = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const hasLocalMedia = (localImageUris?: string[] | null, localAudioUri?: string | null): boolean => {
  if (localImageUris && localImageUris.length > 0) {
    return true;
  }
  if (localAudioUri) {
    return true;
  }
  return false;
};

interface RecipeContextType {
  recipes: RecipeType[];
  collections: RecipeCollection[];
  addRecipe: (recipe: Omit<RecipeType, 'id' | 'saved'>) => void;
  updateRecipe: (id: number, updates: Partial<RecipeType>) => void;
  toggleBookmark: (id: number) => boolean;
  addCollection: (collection: Omit<RecipeCollection, 'id' | 'count'>) => void;
  updateCollection: (id: number, updates: Partial<RecipeCollection>) => void;
  addRecipesToCollection: (collectionId: number, recipeIds: number[]) => void;
  removeRecipe: (id: number) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

const useSupabaseProfileId = () => {
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const resolveProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          setProfileId(session?.user?.id ?? null);
        }
      } catch (error) {
        if (mounted) {
          setProfileId(null);
        }
        console.warn('RecipeContext: Failed to resolve profile id', error);
      }
    };

    resolveProfile();
    const { data: { subscription } = {} } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setProfileId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return profileId;
};

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const profileId = useSupabaseProfileId();
  const [rawRecipes, setRawRecipes] = useState<RecipeModel[]>([]);
  const [rawCollections, setRawCollections] = useState<CollectionModel[]>([]);
  const [rawCollectionLinks, setRawCollectionLinks] = useState<CollectionRecipeModel[]>([]);

  const recipeIdMap = useRef(new Map<string, number>());
  const recipeNumericMap = useRef(new Map<number, string>());
  const nextRecipeNumericId = useRef(1);

  const collectionIdMap = useRef(new Map<string, number>());
  const collectionNumericMap = useRef(new Map<number, string>());
  const nextCollectionNumericId = useRef(1);

  useEffect(() => {
    recipeIdMap.current.clear();
    recipeNumericMap.current.clear();
    nextRecipeNumericId.current = 1;
    collectionIdMap.current.clear();
    collectionNumericMap.current.clear();
    nextCollectionNumericId.current = 1;
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setRawRecipes([]);
      return;
    }
    const query = database
      .get<RecipeModel>('recipes')
      .query(
        Q.where('profile_id', profileId),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc)
      );
    const subscription = query.observeWithColumns(OBSERVE_COLUMNS).subscribe({
      next: setRawRecipes,
      error: (error) => logError('observeRecipes', error),
    });
    return () => subscription.unsubscribe();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setRawCollections([]);
      return;
    }
    const query = database
      .get<CollectionModel>('collections')
      .query(
        Q.where('profile_id', profileId),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc)
      );
    const subscription = query.observeWithColumns(OBSERVE_COLUMNS).subscribe({
      next: setRawCollections,
      error: (error) => logError('observeCollections', error),
    });
    return () => subscription.unsubscribe();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      setRawCollectionLinks([]);
      return;
    }
    const query = database
      .get<CollectionRecipeModel>('collection_recipes')
      .query(
        Q.where('profile_id', profileId),
        Q.where('deleted', false),
        Q.sortBy('updated_at', Q.desc)
      );
    const subscription = query.observeWithColumns(OBSERVE_COLUMNS).subscribe({
      next: setRawCollectionLinks,
      error: (error) => logError('observeCollectionRecipes', error),
    });
    return () => subscription.unsubscribe();
  }, [profileId]);

  const getRecipeNumericId = (recordId: string) => {
    if (recipeIdMap.current.has(recordId)) {
      return recipeIdMap.current.get(recordId)!;
    }
    const nextId = nextRecipeNumericId.current++;
    recipeIdMap.current.set(recordId, nextId);
    recipeNumericMap.current.set(nextId, recordId);
    return nextId;
  };

  const getCollectionNumericId = (recordId: string) => {
    if (collectionIdMap.current.has(recordId)) {
      return collectionIdMap.current.get(recordId)!;
    }
    const nextId = nextCollectionNumericId.current++;
    collectionIdMap.current.set(recordId, nextId);
    collectionNumericMap.current.set(nextId, recordId);
    return nextId;
  };

  const resolveRecipeRecordId = (numericId: number): string | null => {
    return recipeNumericMap.current.get(numericId) ?? null;
  };

  const resolveCollectionRecordId = (numericId: number): string | null => {
    return collectionNumericMap.current.get(numericId) ?? null;
  };

  const collectionRecipeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    rawCollectionLinks.forEach((link) => {
      if (!link.collectionId || !link.recipeId) {
        return;
      }
      const existing = map.get(link.collectionId) ?? [];
      existing.push(link.recipeId);
      map.set(link.collectionId, existing);
    });
    return map;
  }, [rawCollectionLinks]);

  const recipes = useMemo(() =>
    rawRecipes.map((record) => {
      const numericId = getRecipeNumericId(record.id);
      const nutrition = record.nutrition ?? { kcal: '-', protein: '-', carbs: '-', fats: '-' };

      const remoteImagePaths = toStringArray(record.remoteImagePaths ?? []);
      const localImageUris = toStringArray(record.localImageUris ?? []);
      const remoteImageUrls = remoteImagePaths
        .map((path) => getBucketPublicUrl(IMAGE_BUCKET, path))
        .filter((url): url is string => Boolean(url));

      const hasRemoteImages = remoteImageUrls.length > 0;
      const hasLocalImages = localImageUris.length > 0;
      const displayImage = hasRemoteImages
        ? remoteImageUrls[0]
        : hasLocalImages
          ? localImageUris[0]
          : undefined;

      const derivedImages = hasRemoteImages
        ? remoteImageUrls
        : hasLocalImages
          ? localImageUris
          : undefined;

      const image = displayImage;

      const remoteAudioPath = normalizeOptionalString(record.remoteAudioPath ?? null);
      const localAudioUri = normalizeOptionalString(record.localAudioUri ?? null);
      const remoteAudioUrl =
        remoteAudioPath !== undefined ? getBucketPublicUrl(AUDIO_BUCKET, remoteAudioPath) ?? undefined : undefined;
      const audio =
        remoteAudioUrl ?? localAudioUri ?? normalizeOptionalString(record.audioPath ?? null);

      const uploadStatus = normalizeOptionalString(record.uploadStatus ?? null);
      const uploadAttempts = record.uploadAttempts ?? undefined;
      const lastUploadError = normalizeOptionalString(record.lastUploadError ?? null);

      return {
        id: numericId,
        name: record.name,
        image,
        time: record.prepTime || record.cookTime || '',
        servings: record.servings,
        tags: record.tags ?? [],
        saved: record.isSaved,
        ingredients: record.ingredients ?? [],
        nutrition: {
          kcal: nutrition.kcal ?? '-',
          protein: nutrition.protein ?? '-',
          carbs: nutrition.carbs ?? '-',
          fats: nutrition.fats ?? '-',
        },
        audio,
        duration: record.duration ?? undefined,
        url: record.url ?? undefined,
        images: derivedImages,
        uploadStatus,
        localImageUris: localImageUris.length > 0 ? localImageUris : undefined,
        localAudioUri: localAudioUri ?? undefined,
        remoteImagePaths: remoteImagePaths.length > 0 ? remoteImagePaths : undefined,
        remoteAudioPath,
        uploadAttempts,
        lastUploadError,
        countryCode: undefined,
        description: record.description,
        instructions: record.instructions ?? [],
      };
    }) as RecipeType[],
    [rawRecipes]
  );

  const collections = useMemo(() =>
    rawCollections.map((record) => {
      const numericId = getCollectionNumericId(record.id);
      const linkedRecipes = Array.from(
        new Set(collectionRecipeMap.get(record.id) ?? [])
      ).map((recipeRecordId) => getRecipeNumericId(recipeRecordId));
      return {
        id: numericId,
        name: record.name,
        description: record.description,
        color: record.color,
        count: linkedRecipes.length,
        recipeIds: linkedRecipes,
      };
    }) as RecipeCollection[],
    [rawCollections, collectionRecipeMap]
  );

  const addRecipe = (newRecipeData: Omit<RecipeType, 'id' | 'saved'>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const recipeId = String(uuidv4());

    void (async () => {
      const now = Date.now();
      const sanitizedImages = sanitizeImageInputs(newRecipeData.images);
      const sanitizedLocalImageUris = sanitizeImageInputs(newRecipeData.localImageUris);
      const sanitizedLocalAudioUri = normalizeOptionalString(newRecipeData.localAudioUri ?? null);
      const heroImage = sanitizedImages[0] ?? normalizeOptionalString(newRecipeData.image ?? null);
      const pendingMedia = hasLocalMedia(sanitizedLocalImageUris, sanitizedLocalAudioUri ?? null);

      try {
        await database.write(async () => {
          const collection = database.get<RecipeModel>('recipes');
          await collection.create((record) => {
            record._raw.id = recipeId;
            record.profileId = effectiveProfileId;
            record.name = newRecipeData.name;
            record.imagePath = heroImage ?? null;
            record.prepTime = newRecipeData.time || '';
            record.cookTime = '';
            record.servings = newRecipeData.servings;
            record.tags = newRecipeData.tags || [];
            record.ingredients = newRecipeData.ingredients || [];
            record.nutrition = {
              kcal: newRecipeData.nutrition?.kcal ?? '-',
              protein: newRecipeData.nutrition?.protein ?? '-',
              carbs: newRecipeData.nutrition?.carbs ?? '-',
              fats: newRecipeData.nutrition?.fats ?? '-',
            };
            record.description = newRecipeData.description ?? '';
            record.instructions = newRecipeData.instructions ?? [];
            record.isSaved = false;
            record.audioPath = newRecipeData.audio ?? '';
            record.duration = newRecipeData.duration ?? undefined;
            record.url = newRecipeData.url ?? '';
            record.images = sanitizedImages;
            record.localImageUris = sanitizedLocalImageUris;
            record.localAudioUri = sanitizedLocalAudioUri;
            record.remoteImagePaths = [];
            record.remoteAudioPath = undefined;
            record.uploadStatus = pendingMedia ? 'pending_upload' : 'uploaded';
            record.uploadAttempts = 0;
            record.lastUploadError = undefined;
            record.createdAt = now;
            record.updatedAt = now;
            record.deleted = false;
            record.version = 1;
          });
        });
        syncAfterWrite();
        if (pendingMedia) {
          void DocumentUploadScheduler.requestRecipeUploadNow(effectiveProfileId);
        }
      } catch (error) {
        logError('addRecipe', error);
      }
    })();
  };

  const updateRecipe = (id: number, updates: Partial<RecipeType>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const recordId = resolveRecipeRecordId(id);
    if (!recordId) {
      console.warn('RecipeContext: Missing recipe record id for update', id);
      return;
    }

    void (async () => {
      const sanitizedImages = updates.images !== undefined ? sanitizeImageInputs(updates.images) : undefined;
      const sanitizedLocalImageUris =
        updates.localImageUris !== undefined ? sanitizeImageInputs(updates.localImageUris) : undefined;
      const sanitizedLocalAudioUri =
        updates.localAudioUri !== undefined ? normalizeOptionalString(updates.localAudioUri ?? null) : undefined;
      const hasNewLocalImages = sanitizedLocalImageUris !== undefined && sanitizedLocalImageUris.length > 0;
      const hasNewLocalAudio = Boolean(sanitizedLocalAudioUri);
      const shouldTriggerUpload = hasNewLocalImages || hasNewLocalAudio;

      const now = Date.now();
      try {
        await database.write(async () => {
          const record = await database.get<RecipeModel>('recipes').find(recordId);
          if (record.profileId !== effectiveProfileId) {
            return;
          }
          await record.update((draft) => {
            if (updates.name !== undefined) {
              draft.name = updates.name;
            }
            if (updates.image !== undefined) {
              const normalizedImage = normalizeOptionalString(updates.image ?? null);
              draft.imagePath = normalizedImage ?? null;
            }
            if (updates.time !== undefined) {
              draft.prepTime = updates.time;
              draft.cookTime = '';
            }
            if (updates.servings !== undefined) {
              draft.servings = updates.servings;
            }
            if (updates.tags !== undefined) {
              draft.tags = updates.tags;
            }
            if (updates.ingredients !== undefined) {
              draft.ingredients = updates.ingredients;
            }
            if (updates.nutrition !== undefined) {
              draft.nutrition = {
                kcal: updates.nutrition?.kcal ?? '-',
                protein: updates.nutrition?.protein ?? '-',
                carbs: updates.nutrition?.carbs ?? '-',
                fats: updates.nutrition?.fats ?? '-',
              };
            }
            if (updates.description !== undefined) {
              draft.description = updates.description;
            }
            if (updates.instructions !== undefined) {
              draft.instructions = updates.instructions;
            }
            if (updates.audio !== undefined) {
              draft.audioPath = updates.audio ?? '';
            }
            if (updates.duration !== undefined) {
              draft.duration = updates.duration;
            }
            if (updates.url !== undefined) {
              draft.url = updates.url;
            }
            if (sanitizedImages !== undefined) {
              draft.images = sanitizedImages;
              draft.imagePath = sanitizedImages[0] ?? null;
              if (sanitizedImages.length === 0) {
                draft.remoteImagePaths = [];
              }
            }
            if (sanitizedLocalImageUris !== undefined) {
              draft.localImageUris = sanitizedLocalImageUris;
            }
            if (sanitizedLocalAudioUri !== undefined) {
              draft.localAudioUri = sanitizedLocalAudioUri ?? null;
            }
            if (shouldTriggerUpload) {
              draft.uploadStatus = 'pending_upload';
              draft.uploadAttempts = 0;
              draft.lastUploadError = undefined;
            }
            draft.updatedAt = now;
            draft.version = (draft.version ?? 0) + 1;
          });
        });
        syncAfterWrite();
        if (shouldTriggerUpload) {
          void DocumentUploadScheduler.requestRecipeUploadNow(effectiveProfileId);
        }
      } catch (error) {
        logError('updateRecipe', error);
      }
    })();
  };

  const toggleBookmark = (id: number) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      console.warn('RecipeContext: profile_id missing for toggleBookmark');
      return false;
    }
    const recordId = resolveRecipeRecordId(id);
    if (!recordId) {
      console.warn('RecipeContext: Missing recipe record id for toggleBookmark', id);
      return false;
    }
    const currentRecipe = recipes.find((item) => item.id === id);
    const nextValue = currentRecipe ? !currentRecipe.saved : true;
    const now = Date.now();
    database
      .write(async () => {
        const record = await database.get<RecipeModel>('recipes').find(recordId);
        if (record.profileId !== effectiveProfileId) {
          return;
        }
        await record.update((draft) => {
          draft.isSaved = nextValue;
          draft.updatedAt = now;
          draft.version = (draft.version ?? 0) + 1;
        });
      })
      .then(syncAfterWrite)
      .catch((error) => logError('toggleBookmark', error));
    return nextValue;
  };

  const removeRecipe = (id: number) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const recordId = resolveRecipeRecordId(id);
    if (!recordId) {
      console.warn('RecipeContext: Missing recipe record id for removal', id);
      return;
    }
    const now = Date.now();
    database
      .write(async () => {
        const recipeRecord = await database.get<RecipeModel>('recipes').find(recordId);
        if (recipeRecord.profileId !== effectiveProfileId) {
          return;
        }
        const operations: any[] = [
          recipeRecord.prepareUpdate((draft) => {
            draft.deleted = true;
            draft.updatedAt = now;
            draft.version = (draft.version ?? 0) + 1;
          }),
        ];
        const linkCollection = database.get<CollectionRecipeModel>('collection_recipes');
        const links = await linkCollection
          .query(
            Q.where('profile_id', effectiveProfileId),
            Q.where('recipe_id', recordId),
            Q.where('deleted', false)
          )
          .fetch();
        links.forEach((link) => {
          operations.push(
            link.prepareUpdate((draft) => {
              draft.deleted = true;
              draft.updatedAt = now;
              draft.version = (draft.version ?? 0) + 1;
            })
          );
        });
        if (operations.length > 0) {
          await database.batch(...operations);
        }
      })
      .then(syncAfterWrite)
      .catch((error) => logError('removeRecipe', error));
  };

  const addCollection = (newCollectionData: Omit<RecipeCollection, 'id' | 'count'>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const now = Date.now();
    database
      .write(async () => {
        const collection = await database.get<CollectionModel>('collections').create((record) => {
          record.profileId = effectiveProfileId;
          record.name = newCollectionData.name;
          record.description = newCollectionData.description ?? '';
          record.color = newCollectionData.color;
          record.createdAt = now;
          record.updatedAt = now;
          record.deleted = false;
          record.version = 1;
        });
        if (!newCollectionData.recipeIds?.length) {
          return;
        }
        const linkCollection = database.get<CollectionRecipeModel>('collection_recipes');
        const links = newCollectionData.recipeIds
          .map(resolveRecipeRecordId)
          .filter((recipeId): recipeId is string => Boolean(recipeId))
          .map((recipeRecordId) =>
            linkCollection.prepareCreate((link) => {
              link.profileId = effectiveProfileId;
              link.collectionId = collection.id;
              link.recipeId = recipeRecordId;
              link.createdAt = now;
              link.updatedAt = now;
              link.deleted = false;
              link.version = 1;
            })
          );
        if (links.length > 0) {
          await database.batch(...links);
        }
      })
      .then(syncAfterWrite)
      .catch((error) => logError('addCollection', error));
  };

  const updateCollection = (id: number, updates: Partial<RecipeCollection>) => {
    const effectiveProfileId = requireProfileId(profileId);
    if (!effectiveProfileId) {
      return;
    }
    const recordId = resolveCollectionRecordId(id);
    if (!recordId) {
      console.warn('RecipeContext: Missing collection record id for update', id);
      return;
    }
    const now = Date.now();
    database
      .write(async () => {
        const collection = await database.get<CollectionModel>('collections').find(recordId);
        if (collection.profileId !== effectiveProfileId) {
          return;
        }
        await collection.update((draft) => {
          if (updates.name !== undefined) {
            draft.name = updates.name;
          }
          if (updates.description !== undefined) {
            draft.description = updates.description;
          }
          if (updates.color !== undefined) {
            draft.color = updates.color;
          }
          draft.updatedAt = now;
          draft.version = (draft.version ?? 0) + 1;
        });
        if (!updates.recipeIds) {
          return;
        }
        const linkCollection = database.get<CollectionRecipeModel>('collection_recipes');
        const existingLinks = await linkCollection
          .query(
            Q.where('profile_id', effectiveProfileId),
            Q.where('collection_id', recordId),
            Q.where('deleted', false)
          )
          .fetch();
        const desiredRecipeRecordIds = Array.from(new Set(updates.recipeIds))
          .map(resolveRecipeRecordId)
          .filter((recipeId): recipeId is string => Boolean(recipeId));

        const toDelete = existingLinks.filter((link) => !desiredRecipeRecordIds.includes(link.recipeId));
        const toRetain = new Set(existingLinks.map((link) => link.recipeId));
        const toAdd = desiredRecipeRecordIds.filter((recipeRecordId) => !toRetain.has(recipeRecordId));

        const operations: any[] = [];
        toDelete.forEach((link) =>
          operations.push(
            link.prepareUpdate((draft) => {
              draft.deleted = true;
              draft.updatedAt = now;
              draft.version = (draft.version ?? 0) + 1;
            })
          )
        );
        toAdd.forEach((recipeRecordId) =>
          operations.push(
            linkCollection.prepareCreate((link) => {
              link.profileId = effectiveProfileId;
              link.collectionId = recordId;
              link.recipeId = recipeRecordId;
              link.createdAt = now;
              link.updatedAt = now;
              link.deleted = false;
              link.version = 1;
            })
          )
        );
        if (operations.length > 0) {
          await database.batch(...operations);
        }
      })
      .then(syncAfterWrite)
      .catch((error) => logError('updateCollection', error));
  };

  const addRecipesToCollection = (collectionId: number, recipeIds: number[]) => {
    const targetCollection = collections.find((collection) => collection.id === collectionId);
    if (!targetCollection) {
      console.warn('RecipeContext: Collection not found when adding recipes', collectionId);
      return;
    }
    const merged = Array.from(
      new Set([...(targetCollection.recipeIds ?? []), ...recipeIds])
    );
    updateCollection(collectionId, { recipeIds: merged });
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        collections,
        addRecipe,
        updateRecipe,
        toggleBookmark,
        addCollection,
        updateCollection,
        addRecipesToCollection,
        removeRecipe,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipeProvider');
  }
  return context;
};
