import {
  createAutosaveKey,
  deleteAutosave,
  getAutosaveDocumentId,
  getAutosave,
  getOrCreateAutosaveSessionId,
  isAutosaveEnabled,
  setAutosave,
  type AutosaveRecord,
} from '../autosave';

const records = new Map<IDBValidKey, AutosaveRecord>();

const request = <T>(operation: () => T) => {
  const result = {} as IDBRequest<T>;

  setTimeout(() => {
    try {
      Object.defineProperty(result, 'result', { value: operation() });
      result.onsuccess?.(new Event('success') as IDBRequestEventMap['success']);
    } catch (error) {
      Object.defineProperty(result, 'error', { value: error });
      result.onerror?.(new Event('error') as IDBRequestEventMap['error']);
    }
  });

  return result;
};

const objectStore = {
  get: (key: IDBValidKey) => request(() => records.get(key)),
  put: (record: AutosaveRecord) =>
    request(() => {
      records.set(record.key, record);
      return record.key;
    }),
  delete: (key: IDBValidKey) =>
    request(() => {
      records.delete(key);
      return undefined;
    }),
} as unknown as IDBObjectStore;

const database = {
  objectStoreNames: { contains: () => true },
  transaction: () => ({
    objectStore: () => objectStore,
    onerror: null,
  }),
  close: jest.fn(),
} as unknown as IDBDatabase;

const indexedDBMock = {
  open: () => {
    const result = {} as IDBOpenDBRequest;

    Object.defineProperty(result, 'result', { value: database });
    setTimeout(() => result.onsuccess?.(new Event('success') as IDBRequestEventMap['success']));

    return result;
  },
} as unknown as IDBFactory;

describe('autosave storage', () => {
  const originalCrypto = globalThis.crypto;
  let uuid = 0;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: indexedDBMock,
    });
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        randomUUID: () => `00000000-0000-4000-8000-${String(uuid++).padStart(12, '0')}`,
      },
    });
  });

  beforeEach(() => {
    records.clear();
    sessionStorage.clear();
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('stores, reads, and deletes an autosave', async () => {
    const record = {
      key: 'autosave:key',
      data: { title: 'Recovered' },
      savedAt: '2026-01-01T00:00:00.000Z',
    };

    await setAutosave(record);
    expect(await getAutosave(record.key)).toEqual(record);

    await deleteAutosave(record.key);
    expect(await getAutosave(record.key)).toBeUndefined();
    expect(database.close).toHaveBeenCalled();
  });

  it('creates scoped keys with and without a locale', () => {
    expect(
      createAutosaveKey({
        instanceId: 'instance',
        userId: 1,
        model: 'api::article.article',
        documentId: 'document',
        locale: 'en',
      })
    ).toBe('autosave:instance:1:api::article.article:document:en');

    expect(
      createAutosaveKey({
        instanceId: 'instance',
        userId: 'admin',
        model: 'api::article.article',
        documentId: 'document',
      })
    ).toBe('autosave:instance:admin:api::article.article:document:default');
  });

  it('reuses one create-session ID per model and locale', () => {
    const first = getOrCreateAutosaveSessionId('api::article.article', 'en');
    const second = getOrCreateAutosaveSessionId('api::article.article', 'en');
    const otherLocale = getOrCreateAutosaveSessionId('api::article.article', 'fr');

    expect(second).toBe(first);
    expect(otherLocale).not.toBe(first);
  });

  it('selects a stable document ID for existing, create, and single-type forms', () => {
    expect(
      getAutosaveDocumentId({
        documentId: 'document',
        isCreatingDocument: false,
        isSingleType: false,
        model: 'api::article.article',
      })
    ).toBe('document');

    expect(
      getAutosaveDocumentId({
        isCreatingDocument: true,
        isSingleType: false,
        model: 'api::article.article',
        locale: 'en',
      })
    ).toMatch(/^create:/);

    expect(
      getAutosaveDocumentId({
        isCreatingDocument: false,
        isSingleType: true,
        model: 'api::homepage.homepage',
      })
    ).toBe('single:api::homepage.homepage');

    expect(
      getAutosaveDocumentId({
        isCreatingDocument: false,
        isSingleType: false,
        model: 'api::article.article',
      })
    ).toBe('');
  });

  it('enables autosave only for an identified draft-and-publish draft', () => {
    const valid = {
      hasDraftAndPublished: true,
      status: 'draft' as const,
      documentId: 'document',
      userId: 1,
      instanceId: 'instance',
    };

    expect(isAutosaveEnabled(valid)).toBe(true);
    expect(isAutosaveEnabled({ ...valid, status: 'published' })).toBe(false);
    expect(isAutosaveEnabled({ ...valid, hasDraftAndPublished: false })).toBe(false);
    expect(isAutosaveEnabled({ ...valid, documentId: '' })).toBe(false);
    expect(isAutosaveEnabled({ ...valid, userId: undefined })).toBe(false);
    expect(isAutosaveEnabled({ ...valid, instanceId: '' })).toBe(false);
  });
});
