import {
  createAutosaveKey,
  deleteAutosave,
  getAutosaveDocumentId,
  getAutosave,
  getOrCreateAutosaveSessionId,
  isAutosaveEnabled,
  createAutosaveLogoutMiddleware,
  evictAutosavesOverQuota,
  registerAutosaveOwner,
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
  openCursor: () => {
    const result = {} as IDBRequest<IDBCursorWithValue | null>;
    const entries = [...records.entries()];
    let index = 0;

    const advance = () => {
      const entry = entries[index++];
      const cursor = entry
        ? ({
            value: entry[1],
            delete: () => request(() => records.delete(entry[0])),
            continue: () => setTimeout(advance),
          } as unknown as IDBCursorWithValue)
        : null;

      Object.defineProperty(result, 'result', { configurable: true, value: cursor });
      result.onsuccess?.(new Event('success') as IDBRequestEventMap['success']);
    };

    setTimeout(advance);
    return result;
  },
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

  it('keeps every backup while the store stays within its budgets', async () => {
    records.set('old', { key: 'old', data: {}, savedAt: '2020-01-01T00:00:00.000Z' });
    records.set('older', { key: 'older', data: {}, savedAt: '2010-01-01T00:00:00.000Z' });

    await evictAutosavesOverQuota();

    expect([...records.keys()]).toEqual(['old', 'older']);
  });

  it('evicts the least recently backed up documents once over budget', async () => {
    records.set('oldest', { key: 'oldest', data: {}, savedAt: '2026-01-01T00:00:00.000Z' });
    records.set('middle', { key: 'middle', data: {}, savedAt: '2026-02-01T00:00:00.000Z' });
    records.set('newest', { key: 'newest', data: {}, savedAt: '2026-03-01T00:00:00.000Z' });

    await evictAutosavesOverQuota({ maxRecords: 2 });

    expect([...records.keys()]).toEqual(['middle', 'newest']);
  });

  it('never evicts the document being edited, even when it is the oldest', async () => {
    records.set('active', { key: 'active', data: {}, savedAt: '2026-01-01T00:00:00.000Z' });
    records.set('other', { key: 'other', data: {}, savedAt: '2026-02-01T00:00:00.000Z' });

    await evictAutosavesOverQuota({ protectedKey: 'active', maxRecords: 1 });

    expect([...records.keys()]).toEqual(['active']);
  });

  it('evicts by size when a few large backups exceed the byte budget', async () => {
    records.set('small', { key: 'small', data: {}, savedAt: '2026-01-01T00:00:00.000Z' });
    records.set('large', {
      key: 'large',
      data: { body: 'x'.repeat(500) },
      savedAt: '2026-02-01T00:00:00.000Z',
    });

    await evictAutosavesOverQuota({ maxBytes: 400 });

    expect([...records.keys()]).toEqual(['large']);
  });

  it('purges only the signed-out user on logout', async () => {
    const owner = { instanceId: 'instance', userId: 1 };
    records.set('owner', {
      key: createAutosaveKey({
        ...owner,
        model: 'api::article.article',
        documentId: 'one',
      }),
      data: {},
      savedAt: new Date().toISOString(),
    });
    records.set('other-user', {
      key: createAutosaveKey({
        instanceId: 'instance',
        userId: 2,
        model: 'api::article.article',
        documentId: 'two',
      }),
      data: {},
      savedAt: new Date().toISOString(),
    });

    registerAutosaveOwner(owner);
    const next = jest.fn();
    const dispatch = createAutosaveLogoutMiddleware()({
      dispatch: jest.fn(),
      getState: jest.fn(),
    })(next);
    dispatch({ type: 'admin/logout' });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect([...records.keys()]).toEqual(['other-user']);
    expect(next).toHaveBeenCalledWith({ type: 'admin/logout' });
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
