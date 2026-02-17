import RNFS from 'react-native-fs';
import { uuidv4 } from '../utils/uuid';

const MEDIA_ROOT = `${RNFS.DocumentDirectoryPath}/recipes`;

const ensureMediaDir = async (): Promise<void> => {
  const exists = await RNFS.exists(MEDIA_ROOT);
  if (!exists) {
    await RNFS.mkdir(MEDIA_ROOT);
  }
};

const sanitizeName = (uri: string): string => {
  const segments = uri.split(/[\/]+/).filter(Boolean);
  const rawName = segments.pop() ?? uuidv4();
  const cleaned = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  return `${timestamp}_${cleaned}`;
};

const copyFileToMedia = async (sourceUri: string, subDir: string): Promise<string> => {
  if (!sourceUri) {
    throw new Error('RecipeMediaStorage: source URI is required');
  }
  await ensureMediaDir();
  const targetDir = `${MEDIA_ROOT}/${subDir}`;
  const dirExists = await RNFS.exists(targetDir);
  if (!dirExists) {
    await RNFS.mkdir(targetDir);
  }
  const targetPath = `${targetDir}/${sanitizeName(sourceUri)}`;
  const normalizedSource = sourceUri.startsWith('file://')
    ? sourceUri.replace(/^file:\/\//i, '')
    : sourceUri;
  await RNFS.copyFile(normalizedSource, targetPath);
  return `file://${targetPath}`;
};

export const saveRecipeImage = async (uri: string): Promise<string> => {
  return copyFileToMedia(uri, 'images');
};

export const saveRecipeAudio = async (uri: string): Promise<string> => {
  return copyFileToMedia(uri, 'audio');
};
