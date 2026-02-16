import React, { useEffect } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { useDocumentModalSnapshot } from '../src/components/documents/DocumentModalSnapshot';
import { VaultDocument } from '../src/contexts/FamilyContext';

describe('useDocumentModalSnapshot', () => {
    test('keeps snapshot state isolated from reactive model updates until refreshed', () => {
        const document: VaultDocument = {
            id: 'doc-1',
            name: 'Original Document',
            type: 'insurance',
            date: '2024-12-01',
            memberId: 'global',
        };

        const state: { lastSnapshot: VaultDocument | null; refresh?: () => void } = { lastSnapshot: null };

        const SnapshotTester: React.FC<{ document: VaultDocument | null }> = ({ document }) => {
            const { snapshot, refreshSnapshot } = useDocumentModalSnapshot(document);
            useEffect(() => {
                state.lastSnapshot = snapshot ? { ...snapshot } : null;
            }, [snapshot]);
            useEffect(() => {
                state.refresh = refreshSnapshot;
            }, [refreshSnapshot]);
            return null;
        };

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        ReactTestRenderer.act(() => {
            renderer = ReactTestRenderer.create(<SnapshotTester document={document} />);
        });

        expect(state.lastSnapshot?.name).toBe('Original Document');

        document.name = 'Updated Document';
        ReactTestRenderer.act(() => {
            renderer!.update(<SnapshotTester document={document} />);
        });

        expect(state.lastSnapshot?.name).toBe('Original Document');

        ReactTestRenderer.act(() => {
            state.refresh?.();
        });

        expect(state.lastSnapshot?.name).toBe('Updated Document');
    });
});
