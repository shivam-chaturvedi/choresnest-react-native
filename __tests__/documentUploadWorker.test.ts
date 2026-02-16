import { DocumentUploadWorker, DocumentUploadStatus } from '../src/services/documents/DocumentUploadWorker';

describe('DocumentUploadWorker', () => {
    beforeEach(() => {
        jest.useRealTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    const createWorker = (overrides: any = {}) => {
        const worker = new DocumentUploadWorker({
            fetchDocuments: overrides.fetchDocuments,
            persist: overrides.persist,
            upload: overrides.upload,
            isOnline: overrides.isOnline,
            isGuest: overrides.isGuest,
        });
        worker.setProfileId('user-123');
        return worker;
    };

    const buildDocument = () => ({
        id: 'doc-1',
        profileId: 'user-123',
        localUri: '/tmp/doc.pdf',
        uploadStatus: 'pending_upload' as DocumentUploadStatus,
        uploadAttempts: 0,
    });

    test('skips processing when offline', async () => {
        const fetchDocuments = jest.fn(async () => [buildDocument()]);
        const worker = createWorker({
            fetchDocuments,
            persist: jest.fn(),
            upload: jest.fn(),
            isOnline: async () => false,
            isGuest: async () => false,
        });

        await worker.start();
        await Promise.resolve();

        expect(fetchDocuments).not.toHaveBeenCalled();
    });

    test('skips processing when guest', async () => {
        const fetchDocuments = jest.fn(async () => [buildDocument()]);
        const worker = createWorker({
            fetchDocuments,
            persist: jest.fn(),
            upload: jest.fn(),
            isOnline: async () => true,
            isGuest: async () => true,
        });

        await worker.start();
        await Promise.resolve();

        expect(fetchDocuments).not.toHaveBeenCalled();
    });

    test('uploads document and persists metadata', async () => {
        const document = buildDocument();
        const fetchDocuments = jest.fn(async () => [document]);
        const persist = jest.fn(async (_record, updates) => {
            Object.assign(document, updates);
        });
        const upload = jest.fn(async () => ({
            remotePath: 'vault-documents/user/doc.pdf',
            contentType: 'application/pdf',
            fileSize: 1024,
            checksum: 'abc123',
        }));

        const worker = createWorker({
            fetchDocuments,
            persist,
            upload,
            isOnline: async () => true,
            isGuest: async () => false,
        });

        await worker.start();
        await Promise.resolve();

        expect(upload).toHaveBeenCalledTimes(1);
        expect(persist).toHaveBeenLastCalledWith(expect.anything(),
            expect.objectContaining({
                uploadStatus: 'uploaded',
                remotePath: 'vault-documents/user/doc.pdf',
                filePath: 'vault-documents/user/doc.pdf',
                contentType: 'application/pdf',
                fileSize: 1024,
                checksum: 'abc123',
            })
        );
    });

    test('retries series when upload fails and succeeds', async () => {
        jest.useFakeTimers();
        let attempt = 0;
        const document = buildDocument();
        const fetchDocuments = jest.fn(async () => [document]);
        const persist = jest.fn(async (_record, updates) => {
            Object.assign(document, updates);
        });
        const upload = jest.fn(async () => {
            attempt += 1;
            if (attempt === 1) {
                throw new Error('boom');
            }
            return {
                remotePath: 'vault-documents/user/doc.pdf',
                contentType: 'application/pdf',
                fileSize: 1024,
                checksum: 'abc123',
            };
        });

        const worker = createWorker({
            fetchDocuments,
            persist,
            upload,
            isOnline: async () => true,
            isGuest: async () => false,
        });

        await worker.start();
        await Promise.resolve();

        expect(upload).toHaveBeenCalledTimes(1);
        expect(persist).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ uploadStatus: 'failed' }));

        jest.runOnlyPendingTimers();
        await Promise.resolve();
        await Promise.resolve();

        expect(upload).toHaveBeenCalledTimes(2);
        expect(persist).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ uploadStatus: 'uploaded' }));
    });
});
