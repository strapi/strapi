const DATABASE_NAME = 'strapi-content-manager';
const DATABASE_VERSION = 1;
const STORE_NAME = 'autosaves';

export interface AutosaveRecord {
  key: string;
  data: object;
  baseVersion?: string;
  savedAt: string;
}

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const database = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const getAutosave = (key: string) =>
  runTransaction<AutosaveRecord | undefined>('readonly', (store) => store.get(key));

export const setAutosave = (record: AutosaveRecord) =>
  runTransaction<IDBValidKey>('readwrite', (store) => store.put(record));

export const deleteAutosave = (key: string) =>
  runTransaction<undefined>('readwrite', (store) => store.delete(key));

export const createAutosaveKey = ({
  instanceId,
  userId,
  model,
  documentId,
  locale,
}: {
  instanceId: string;
  userId: string | number;
  model: string;
  documentId: string;
  locale?: string;
}) => `autosave:${instanceId}:${userId}:${model}:${documentId}:${locale ?? 'default'}`;

export const getOrCreateAutosaveSessionId = (model: string, locale?: string) => {
  const storageKey = `strapi-autosave-session:${model}:${locale ?? 'default'}`;
  const sessionId = crypto.randomUUID();

  try {
    const existing = sessionStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    sessionStorage.setItem(storageKey, sessionId);

    return sessionId;
  } catch {
    return sessionId;
  }
};

export const getAutosaveDocumentId = ({
  documentId,
  isCreatingDocument,
  isSingleType,
  model,
  locale,
}: {
  documentId?: string;
  isCreatingDocument: boolean;
  isSingleType: boolean;
  model: string;
  locale?: string;
}) => {
  if (documentId) {
    return documentId;
  }

  if (isCreatingDocument) {
    return `create:${getOrCreateAutosaveSessionId(model, locale)}`;
  }

  return isSingleType ? `single:${model}` : '';
};

export const isAutosaveEnabled = ({
  hasDraftAndPublished,
  status,
  documentId,
  userId,
  instanceId,
}: {
  hasDraftAndPublished: boolean;
  status: 'draft' | 'published';
  documentId: string;
  userId?: string | number;
  instanceId: string;
}) =>
  hasDraftAndPublished &&
  status === 'draft' &&
  Boolean(documentId) &&
  userId !== undefined &&
  Boolean(instanceId);
