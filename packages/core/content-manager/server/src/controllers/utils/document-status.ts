/**
 * Index items by documentId for lookup
 *
 * @param items - Array of items with documentId property
 * @returns Map of documentId -> items array
 */
export const indexByDocumentId = <T extends { documentId?: string | null }>(
  items: T[]
): Map<string, T[]> => {
  const map = new Map<string, T[]>();

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
