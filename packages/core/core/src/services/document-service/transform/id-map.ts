import { Strapi } from '@strapi/types';
import { mapAsync } from '@strapi/utils';

const encodeKey = (...values: string[]) => {
  return values.join(':::');
};

export interface IdMap {
  loadedIds: Map<string, string>;
  toLoadIds: Map<string, { uid: string; documentId: string; locale?: string | null }>;
  add(uid: string, documentId: string, locale?: string | null): void;
  load(): Promise<void>;
  get(uid: string, documentId: string, locale?: string | null): string | undefined;
  clear(): void;
}

/**
 * Holds a registry of document ids and their corresponding entity ids.
 */
const createIdMap = ({ strapi }: { strapi: Strapi }): IdMap => {
  const loadedIds = new Map();
  const toLoadIds = new Map();

  return {
    loadedIds,
    toLoadIds,
    /**
     * Register a new document id and its corresponding entity id.
     */
    add(uid: string, documentId: string, locale?: string | null) {
      const key = encodeKey(uid, documentId, locale || '');

      // If the id is already loaded, do nothing
      if (loadedIds.has(key)) return;
      // If the id is already in the toLoadIds, do nothing
      if (toLoadIds.has(key)) return;

      // Add the id to the toLoadIds
      toLoadIds.set(key, { uid, documentId, locale });
    },

    /**
     * Load all ids from the registry.
     */
    async load() {
      // Document Id to Entry Id queries are batched by its uid and locale
      // TODO: Add publication state too
      const loadIdValues = Array.from(toLoadIds.values());

      // 1. Group ids to query together
      const idsByUidAndLocale = loadIdValues.reduce((acc, { uid, documentId, locale }) => {
        const key = encodeKey(uid, locale || '');
        const ids = acc[key] || { uid, locale, documentIds: [] };
        ids.documentIds.push(documentId);
        return { ...acc, [key]: ids };
      }, {});

      // 2. Query ids
      await mapAsync(
        Object.values(idsByUidAndLocale),
        async ({ uid, locale, documentIds }: any) => {
          const result = await strapi?.db?.query(uid).findMany({
            select: ['id', 'documentId', 'locale'],
            where: {
              documentId: { $in: documentIds },
              locale: locale || null,
              publishedAt: null,
              // TODO: Fix this
              // publishedAt: isDraft ? null : { $ne: null },
            },
          });

          // 3. Store result in loadedIds
          result?.forEach(({ documentId, id, locale }) => {
            const key = encodeKey(uid, documentId, locale || '');
            loadedIds.set(key, id);
          });
        }
      );

      // 4. Clear toLoadIds
      toLoadIds.clear();
    },

    /**
     * Get the entity id for a given document id.
     */
    get(uid: string, documentId: string, locale?: string | null) {
      const key = encodeKey(uid, documentId, locale || '');
      return loadedIds.get(key);
    },

    /**
     * Clear the registry.
     */
    clear() {
      loadedIds.clear();
      toLoadIds.clear();
    },
  };
};

export { createIdMap };
