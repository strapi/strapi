import * as React from 'react';

import { getFetchClient } from '@strapi/admin/strapi-admin';

export interface SpaceSummary {
  id: number;
  name: string;
  slug: string;
}

/** `null` means the document belongs to no space and every space can see it. */
type Ownership = SpaceSummary | null;

interface PendingBatch {
  documentIds: Set<string>;
  waiters: Array<(_ownership: Record<string, Ownership>) => void>;
  timer: ReturnType<typeof setTimeout>;
}

const batches = new Map<string, PendingBatch>();
const cache = new Map<string, Ownership>();

/**
 * How long requests are collected before one goes out. A table renders all its
 * cells in the same tick, so this only has to outlast a render — it is not a
 * throttle.
 */
const BATCH_WINDOW_MS = 10;

const keyOf = (uid: string, documentId: string) => `${uid}::${documentId}`;

const flush = async (uid: string) => {
  const batch = batches.get(uid);

  if (!batch) {
    return;
  }

  batches.delete(uid);

  const documentIds = [...batch.documentIds];

  try {
    const { get } = getFetchClient();
    const { data } = await get<{ data: Record<string, Ownership> }>('/spaces/ownership', {
      params: { uid, documentIds: documentIds.join(',') },
    });

    for (const documentId of documentIds) {
      cache.set(keyOf(uid, documentId), data.data[documentId] ?? null);
    }

    batch.waiters.forEach((resolve) => resolve(data.data));
  } catch {
    // A failure here costs a column, not the page. Leaving the cache empty
    // lets a later render try again rather than showing a wrong owner.
    batch.waiters.forEach((resolve) => resolve({}));
  }
};

const request = (uid: string, documentId: string): Promise<Record<string, Ownership>> => {
  const existing = batches.get(uid);

  if (existing) {
    existing.documentIds.add(documentId);

    return new Promise((resolve) => {
      existing.waiters.push(resolve);
    });
  }

  return new Promise((resolve) => {
    batches.set(uid, {
      documentIds: new Set([documentId]),
      waiters: [resolve],
      timer: setTimeout(() => flush(uid), BATCH_WINDOW_MS),
    });
  });
};

/**
 * The space a document belongs to.
 *
 * Every cell in a table asks separately, and they are collected into one
 * request per content type — a list of fifty rows should cost one lookup, not
 * fifty.
 */
export const useDocumentSpace = (uid: string, documentId: string) => {
  const [ownership, setOwnership] = React.useState<Ownership | undefined>(() =>
    cache.get(keyOf(uid, documentId))
  );

  React.useEffect(() => {
    if (!uid || !documentId) {
      return undefined;
    }

    let cancelled = false;
    const cached = cache.get(keyOf(uid, documentId));

    if (cached !== undefined) {
      setOwnership(cached);

      return undefined;
    }

    request(uid, documentId).then((result) => {
      if (!cancelled) {
        setOwnership(result[documentId] ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid, documentId]);

  return ownership;
};

/** Drops what is remembered, so a space switch does not show the old answer. */
export const clearDocumentSpaceCache = () => {
  cache.clear();
};
