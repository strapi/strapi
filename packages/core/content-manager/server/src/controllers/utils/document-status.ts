import type { Data } from '@strapi/types';

/**
 * Index items by documentId for lookup
 *
 * @param items - Array of items with documentId property
 * @returns Map of documentId -> items array
 */
export const indexByDocumentId = <T extends { documentId?: Data.DocumentID | null }>(
  items: T[]
): Map<Data.DocumentID, T[]> => {
  const map = new Map<Data.DocumentID, T[]>();

  for (const item of items) {
    const key = item.documentId;
    if (!key) {
      // eslint-disable-next-line no-continue
      continue;
    }

    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }

  return map;
};
