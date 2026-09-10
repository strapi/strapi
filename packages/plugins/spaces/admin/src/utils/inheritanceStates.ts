import * as React from 'react';

import { getFetchClient } from '@strapi/admin/strapi-admin';

import { getCurrentSpaceSlug } from './currentSpace';

import type { InheritanceSummary } from '../services/spaces';

/**
 * "How many workspaces have their own version of this entry?", asked once per
 * page instead of once per row.
 *
 * Same shape as `entryStates.ts` and for the same reason: the question is asked
 * by a table cell, so a naive implementation is one HTTP request per row. This
 * one collects the ids requested within a short window and answers them all
 * with a single `documentIds=a,b,c` call. It is only ever asked in the default
 * workspace, and only about entries that are shared — a workspace's own entries
 * inherit nothing.
 */

const TTL_MS = 10_000;
const BATCH_WINDOW_MS = 10;
const MAX_IDS_PER_REQUEST = 200;

interface CacheEntry {
  at: number;
  summary: InheritanceSummary | null;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
const queued = new Map<string, Set<string>>();
const flushing = new Map<string, Promise<void>>();

const cacheKey = (model: string, documentId: string) =>
  `${getCurrentSpaceSlug()}:${model}:${documentId}`;

const readFresh = (model: string, documentId: string): CacheEntry | undefined => {
  const hit = cache.get(cacheKey(model, documentId));
  return hit && Date.now() - hit.at < TTL_MS ? hit : undefined;
};

const request = async (model: string, documentIds: string[]): Promise<void> => {
  let data: Record<string, InheritanceSummary> = {};

  try {
    const { get } = getFetchClient();
    const res = await get<{ data: Record<string, InheritanceSummary> }>('/spaces/inheritance', {
      params: { contentType: model, documentIds: documentIds.join(',') },
    });
    data = res.data?.data ?? {};
  } catch {
    // Nothing to show is the right answer to a failure here: the column is
    // informative, never a permission.
  }

  const at = Date.now();
  for (const documentId of documentIds) {
    cache.set(cacheKey(model, documentId), { at, summary: data[documentId] ?? null });
  }
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const flush = (model: string): Promise<void> => {
  const inFlight = flushing.get(model);
  if (inFlight) {
    return inFlight;
  }

  const promise = new Promise<void>((resolve) => {
    setTimeout(async () => {
      const documentIds = [...(queued.get(model) ?? [])];
      queued.delete(model);
      flushing.delete(model);
      await Promise.all(chunk(documentIds, MAX_IDS_PER_REQUEST).map((ids) => request(model, ids)));
      resolve();
    }, BATCH_WINDOW_MS);
  });

  flushing.set(model, promise);
  return promise;
};

const fetchSummaries = async (
  model: string,
  documentIds: string[]
): Promise<Record<string, InheritanceSummary | null>> => {
  if (!model || documentIds.length === 0) {
    return {};
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const missing = documentIds.filter((documentId) => !readFresh(model, documentId));
    if (missing.length === 0) {
      break;
    }
    const pending = queued.get(model) ?? new Set<string>();
    missing.forEach((documentId) => pending.add(documentId));
    queued.set(model, pending);
    await flush(model);
  }

  return Object.fromEntries(
    documentIds.map((documentId) => [documentId, readFresh(model, documentId)?.summary ?? null])
  );
};

/** Called after an override, a reset, a move or a workspace switch. */
export const clearInheritanceCache = (): void => {
  cache.clear();
  queued.clear();
  listeners.forEach((listener) => listener());
};

const EMPTY: Record<string, InheritanceSummary | null> = {};

export const useInheritanceSummaries = (
  model: string,
  documentIds: string[]
): Record<string, InheritanceSummary | null> => {
  const [summaries, setSummaries] = React.useState(EMPTY);
  const key = documentIds.join(',');
  const [revision, setRevision] = React.useState(0);

  React.useEffect(() => {
    const listener = () => setRevision((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  React.useEffect(() => {
    if (!model || key.length === 0) {
      setSummaries(EMPTY);
      return undefined;
    }
    let cancelled = false;
    fetchSummaries(model, key.split(',')).then((next) => {
      if (!cancelled) {
        setSummaries(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [model, key, revision]);

  return summaries;
};
