import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { VaultDocument } from '../../contexts/FamilyContext';

export type DocumentModalSnapshotResult = {
    snapshot: VaultDocument | null;
    setSnapshot: Dispatch<SetStateAction<VaultDocument | null>>;
    refreshSnapshot: () => void;
};

export const useDocumentModalSnapshot = (document: VaultDocument | null): DocumentModalSnapshotResult => {
    const [snapshot, setSnapshot] = useState<VaultDocument | null>(document ? { ...document } : null);
    const lastIdRef = useRef<string | null>(document?.id ?? null);

    useEffect(() => {
        if (!document) {
            setSnapshot(null);
            lastIdRef.current = null;
            return;
        }
        if (lastIdRef.current !== document.id) {
            setSnapshot({ ...document });
            lastIdRef.current = document.id;
        }
    }, [document]);

    const refreshSnapshot = () => {
        if (!document) {
            setSnapshot(null);
            lastIdRef.current = null;
            return;
        }
        setSnapshot({ ...document });
        lastIdRef.current = document.id;
    };

    return { snapshot, setSnapshot, refreshSnapshot };
};
