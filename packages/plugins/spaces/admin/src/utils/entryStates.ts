import * as React from 'react';

import { getFetchClient } from '@strapi/admin/strapi-admin';

import { getCurrentSpaceSlug, useCurrentSpaceSlug } from './currentSpace';

import type { EntryState } from '../services/spaces';

/**
 * The one place the admin asks "may this workspace edit that entry?".
 *
 * Every read-only affordance needs the answer — the lock in the header, the
 * side panel, the guard on each document and bulk action, the RBAC middleware
 * (which runs outside React and cannot use a hook). On a list view that is one
 * question per row, asked by several components each, and the naive shape of it
 * was one HTTP request per row: a 100-row page meant 100 requests.
 *
 * So callers never hit the network directly. They ask this module, which
 * collects the ids requested within a short window and answers them all with a
 * single `documentIds=a,b,c` call — the endpoint already accepts up to 200.
 *
 * Answers are cached per **workspace**: the same entry is editable in one and
 * read-only in another, so the active workspace is part of the key. A move or a
 * share clears the cache and notifies the subscribed components.
 */

const TTL_MS = 10_000;

/** Batching window. Long enough to collect one render pass, short enough to be invisible. */
const BATCH_WINDOW_MS = 10;

/** The endpoint's own cap on `documentIds`. */
const MAX_IDS_PER_REQUEST = 200;

interface CacheEntry {
  at: number;
  state: EntryState | null;
}

const cache = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();

const cacheKey = (model: string, documentId: string) =>
  `${getCurrentSpaceSlug()}:${model}:${documentId}`;

const readFresh = (model: string, documentId: string): CacheEntry | undefined => {
  const hit = cache.get(cacheKey(model, documentId));
  return hit && Date.now() - hit.at < TTL_MS ? hit : undefined;
};

/* -------------------------------------------------------------------------- */
/*                                  Batching                                  */
/* -------------------------------------------------------------------------- */

/** Ids waiting for the next flush, per content type. */
const queued = new Map<string, Set<string>>();
/** The flush in progress for a content type, so concurrent callers share it. */
const flushing = new Map<string, Promise<void>>();

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const request = async (model: string, documentIds: string[]): Promise<void> => {
  let data: Record<string, EntryState> = {};

  try {
    const { get } = getFetchClient();
    const res = await get<{ data: Record<string, EntryState> }>('/spaces/entry-states', {
      params: { contentType: model, documentIds: documentIds.join(',') },
    });
    data = res.data?.data ?? {};
  } catch {
    // Unknown or unscoped content type, network error: never lock on a guess.
    // The ids are still cached as `null` below so we do not retry in a loop.
  }

  const at = Date.now();
  for (const documentId of documentIds) {
    cache.set(cacheKey(model, documentId), { at, state: data[documentId] ?? null });
  }
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

/**
 * The state of every requested document, from cache or from one batched call.
 * A document the workspace cannot see (or that does not exist) answers `null`.
 */
export const fetchEntryStates = async (
  model: string,
  documentIds: string[]
): Promise<Record<string, EntryState | null>> => {
  if (!model || documentIds.length === 0) {
    return {};
  }

  // One extra pass covers the case of joining a flush whose id list was already
  // taken; `request` caches every id it was given, so this always terminates.
  for (let pass = 0; pass < 2; pass += 1) {
    const missing = documentIds.filter((documentId) => !readFresh(model, documentId));
    if (missing.length === 0) {
      break;
    }

    const pendingForModel = queued.get(model) ?? new Set<string>();
    missing.forEach((documentId) => pendingForModel.add(documentId));
    queued.set(model, pendingForModel);

    await flush(model);
  }

  return Object.fromEntries(
    documentIds.map((documentId) => [documentId, readFresh(model, documentId)?.state ?? null])
  );
};

/** Single-document flavour, for the RBAC middleware (no React, no hooks). */
export const fetchEntryState = async (
  model: string,
  documentId: string
): Promise<EntryState | null> => (await fetchEntryStates(model, [documentId]))[documentId] ?? null;

export const subscribeToEntryStates = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Called after a move, a share, or a workspace switch. */
export const clearEntryStateCache = (): void => {
  cache.clear();
  queued.clear();
  listeners.forEach((listener) => listener());
};

/* -------------------------------------------------------------------------- */
/*                                    Hook                                    */
/* -------------------------------------------------------------------------- */

const EMPTY: Record<string, EntryState | null> = {};

/**
 * Entry states for a set of documents, batched with everything else the page
 * asks for in the same moment and refreshed when the cache is cleared.
 *
 * Pass an empty `documentIds` (or an empty `model`) to ask nothing — that is
 * how callers opt out in the default workspace, which edits everything.
 */
export const useEntryStates = (
  model: string,
  documentIds: string[]
): Record<string, EntryState | null> => {
  const [states, setStates] = React.useState<Record<string, EntryState | null>>(EMPTY);
  // The ids are usually a fresh array every render; their content is what matters.
  const key = documentIds.join(',');
  // Reactive: a workspace switch must re-run the lookup, not reuse the answer
  // the previous workspace got.
  const spaceSlug = useCurrentSpaceSlug();

  /**
   * A cache clear bumps a counter rather than re-fetching from the listener.
   * The listener closes over the arguments of the render that subscribed, and a
   * clear usually accompanies a change to those very arguments (a workspace
   * switch, a move) — fetching from it would fire a request for the state of
   * affairs that just ended. Re-rendering first lets the effect below decide
   * with current arguments, which in the default workspace means not asking.
   */
  const [revision, setRevision] = React.useState(0);
  React.useEffect(() => subscribeToEntryStates(() => setRevision((n) => n + 1)), []);

  React.useEffect(() => {
    if (!model || key.length === 0) {
      setStates(EMPTY);
      return undefined;
    }

    let cancelled = false;

    fetchEntryStates(model, key.split(',')).then((next) => {
      if (!cancelled) {
        setStates(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [model, key, spaceSlug, revision]);

  return states;
};
