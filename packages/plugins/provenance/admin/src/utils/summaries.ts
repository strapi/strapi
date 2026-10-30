import { getFetchClient } from '@strapi/admin/strapi-admin';

import { PLUGIN_ID } from '../constants';

export type EntrySummary = { ai: number; toReview: number };

type Resolve = (value: EntrySummary | null) => void;

type Batch = {
  uid: string;
  locale: string | undefined;
  waiting: Map<string, Resolve[]>;
};

const EMPTY: EntrySummary = { ai: 0, toReview: 0 };
const MAX_CACHED = 500;

const cache = new Map<string, Promise<EntrySummary | null>>();
const batches = new Map<string, Batch>();

const flush = async (batchKey: string) => {
  const batch = batches.get(batchKey);
  batches.delete(batchKey);

  if (batch === undefined) {
    return;
  }

  const resolveAll = (getSummary: (documentId: string) => EntrySummary | null) => {
    batch.waiting.forEach((resolvers, documentId) => {
      resolvers.forEach((resolve) => resolve(getSummary(documentId)));
    });
  };

  try {
    const { data } = await getFetchClient().get<{ data: Record<string, EntrySummary> }>(
      `/${PLUGIN_ID}/summary/${batch.uid}`,
      { params: { documentIds: [...batch.waiting.keys()].join(','), locale: batch.locale } }
    );

    resolveAll((documentId) => data.data[documentId] ?? EMPTY);
  } catch {
    resolveAll(() => null);
  }
};

/**
 * The AI summary of one entry of a list. The cells of a list page ask in the same tick, so
 * their requests are grouped into one. `version` changes when the entry does, which skips
 * the cached summary.
 */
export const loadSummary = ({
  uid,
  locale,
  documentId,
  version,
}: {
  uid: string;
  locale: string | undefined;
  documentId: string;
  version: string;
}) => {
  const key = [uid, locale, documentId, version].join('|');
  const cached = cache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  if (cache.size > MAX_CACHED) {
    cache.clear();
  }

  const promise = new Promise<EntrySummary | null>((resolve) => {
    const batchKey = `${uid}|${locale}`;
    let batch = batches.get(batchKey);

    if (batch === undefined) {
      batch = { uid, locale, waiting: new Map() };
      batches.set(batchKey, batch);
      setTimeout(() => flush(batchKey), 0);
    }

    batch.waiting.set(documentId, [...(batch.waiting.get(documentId) ?? []), resolve]);
  });

  cache.set(key, promise);

  return promise;
};
