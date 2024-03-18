import { Core, Data } from '@strapi/types';
import { async } from '@strapi/utils';

/**
 * TODO: Find a better way to encode keys than this
 * This converts an object into a string by joining its keys and values,
 * so it can be used as a key in a Map.
 *
 * @example
 * const obj = { a: 1, b: 2 };
 * const key = encodeKey(obj);
 *      ^ "a:::1&&b:::2"
 */
const encodeKey = (obj: any) => {
  // Sort keys to always keep the same order when encoding
  const keys = Object.keys(obj).sort();
  return keys.map((key) => `${key}:::${obj[key]}`).join('&&');
};

interface KeyFields {
  uid: string;
  documentId: Data.ID;
  locale?: string | null;
  status?: 'draft' | 'published';
}

export interface IdMap {
  loadedIds: Map<string, string>;
  toLoadIds: Map<string, KeyFields>;
  // Make the Keys type to be the params of add
  add(keys: KeyFields): void;
  load(): Promise<void>;
  get(keys: KeyFields): string | undefined;
  clear(): void;
}

/**
 * Holds a registry of document ids and their corresponding entity ids.
 */
const createIdMap = ({ strapi }: { strapi: Core.Strapi }): IdMap => {
  const loadedIds = new Map();
  const toLoadIds = new Map();

  return {
    loadedIds,
    toLoadIds,
    /**
     * Register a new document id and its corresponding entity id.
     */
    add(keyFields: KeyFields) {
      const key = encodeKey({ status: 'published', locale: null, ...keyFields });

      // If the id is already loaded, do nothing
      if (loadedIds.has(key)) return;
      // If the id is already in the toLoadIds, do nothing
      if (toLoadIds.has(key)) return;

      // Add the id to the toLoadIds
      toLoadIds.set(key, keyFields);
    },

    /**
     * Load all ids from the registry.
     */
    async load() {
      // Document Id to Entry Id queries are batched by its uid and locale
      // TODO: Add publication state too
      const loadIdValues = Array.from(toLoadIds.values());

      // 1. Group ids to query together
      const idsByUidAndLocale = loadIdValues.reduce((acc, { documentId, ...rest }) => {
        const key = encodeKey(rest);
        const ids = acc[key] || { ...rest, documentIds: [] };
        ids.documentIds.push(documentId);
        return { ...acc, [key]: ids };
      }, {});

      // 2. Query ids
      await async.map(
        Object.values(idsByUidAndLocale),
        async ({ uid, locale, documentIds, status }: any) => {
          const findParams = {
            select: ['id', 'documentId', 'locale', 'publishedAt'],
            where: {
              documentId: { $in: documentIds },
              locale: locale || null,
              publishedAt: status === 'draft' ? null : { $ne: null },
            },
          } as any;

          const result = await strapi?.db?.query(uid).findMany(findParams);

          // 3. Store result in loadedIds
          result?.forEach(({ documentId, id, locale, publishedAt }: any) => {
            const key = encodeKey({
              documentId,
              uid,
              locale,
              status: publishedAt ? 'published' : 'draft',
            });
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
    get(keys: KeyFields) {
      const key = encodeKey({ status: 'published', locale: null, ...keys });
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
