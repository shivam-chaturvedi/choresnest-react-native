import type { DocumentUploadStatus } from "../documents/types";

export type DocumentSyncStatusUpdate = {
  documentId: string;
  status: DocumentUploadStatus;
  detail?: string;
  progress?: number;
};

type Listener = (update: DocumentSyncStatusUpdate) => void;

const listeners = new Set<Listener>();

export const DocumentSyncStatusService = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  notify(update: DocumentSyncStatusUpdate) {
    listeners.forEach(listener => listener(update));
  },
};
