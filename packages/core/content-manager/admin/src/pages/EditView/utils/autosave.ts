import type { Middleware } from '@reduxjs/toolkit';

const DATABASE_NAME = 'strapi-content-manager';
const DATABASE_VERSION = 1;
const STORE_NAME = 'autosaves';

/**
 * Backups are unsaved work, so they never expire on a timer — someone returning from a long
 * holiday must still find their draft. The store is bounded by volume instead: when it outgrows
 * these budgets, the least recently backed up documents are evicted first.
 */
const AUTOSAVE_MAX_RECORDS = 200;
const AUTOSAVE_MAX_BYTES = 10 * 1024 * 1024;

const registeredOwners = new Set<string>();

export interface AutosaveRecord {
  key: string;
  data: object;
  baseVersion?: string;
  savedAt: string;
}

interface AutosaveOwner {
  instanceId: string;
  userId: string | number;
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

const createOwnerPrefix = ({ instanceId, userId }: AutosaveOwner) =>
  `autosave:${instanceId}:${userId}:`;

const runCursorTransaction = async (
  shouldDelete: (record: AutosaveRecord) => boolean
): Promise<void> => {
  const database = await openDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).openCursor();

      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve();
          return;
        }

        if (shouldDelete(cursor.value as AutosaveRecord)) {
          cursor.delete();
        }

        cursor.continue();
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

interface AutosaveFootprint {
  key: string;
  savedAt: string;
  bytes: number;
}

const listAutosaveFootprints = async (): Promise<AutosaveFootprint[]> => {
  const database = await openDatabase();

  try {
    return await new Promise<AutosaveFootprint[]>((resolve, reject) => {
      const footprints: AutosaveFootprint[] = [];
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).openCursor();

      request.onsuccess = () => {
        const cursor = request.result;

        if (!cursor) {
          resolve(footprints);
          return;
        }

        const record = cursor.value as AutosaveRecord;

        footprints.push({
          key: record.key,
          savedAt: record.savedAt,
          bytes: JSON.stringify(record).length,
        });

        cursor.continue();
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const evictAutosavesOverQuota = async ({
  protectedKey,
  maxRecords = AUTOSAVE_MAX_RECORDS,
  maxBytes = AUTOSAVE_MAX_BYTES,
}: { protectedKey?: string; maxRecords?: number; maxBytes?: number } = {}) => {
  const footprints = await listAutosaveFootprints();

  let records = footprints.length;
  let bytes = footprints.reduce((total, footprint) => total + footprint.bytes, 0);

  if (records <= maxRecords && bytes <= maxBytes) {
    return;
  }

  const evictable = footprints
    .filter((footprint) => footprint.key !== protectedKey)
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  const evicted = new Set<string>();

  for (const footprint of evictable) {
    // A single oversized backup must not drag the whole store down with it: the most recent
    // remaining backup is always kept, whatever the byte budget says.
    if (records <= 1 || (records <= maxRecords && bytes <= maxBytes)) {
      break;
    }

    evicted.add(footprint.key);
    records -= 1;
    bytes -= footprint.bytes;
  }

  if (evicted.size === 0) {
    return;
  }

  await runCursorTransaction(({ key }) => evicted.has(key));
};

export const registerAutosaveOwner = (owner: AutosaveOwner) => {
  registeredOwners.add(createOwnerPrefix(owner));
};

export const purgeRegisteredAutosaves = async () => {
  const prefixes = [...registeredOwners];

  if (prefixes.length === 0) {
    return;
  }

  await runCursorTransaction(({ key }) => prefixes.some((prefix) => key.startsWith(prefix)));
  prefixes.forEach((prefix) => registeredOwners.delete(prefix));
};

export const createAutosaveLogoutMiddleware = (): Middleware => () => (next) => (action) => {
  if (
    typeof action === 'object' &&
    action !== null &&
    'type' in action &&
    action.type === 'admin/logout'
  ) {
    purgeRegisteredAutosaves().catch(() => undefined);
  }

  return next(action);
};

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
