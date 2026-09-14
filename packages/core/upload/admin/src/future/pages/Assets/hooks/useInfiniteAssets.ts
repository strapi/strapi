import { createElement, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch, useStore } from 'react-redux';

import { uploadApi } from '../../../services/api';
import { useGetAssetsQuery } from '../../../services/assets';
import { useTypedSelector } from '../../../store/hooks';
import { selectCompletedUploads } from '../../../store/uploadProgress';
import { getRelationId } from '../../../utils/getRelationId';
import { mergeUploadedAssets } from '../utils/mergeUploadedAssets';

import type { File, Pagination } from '../../../../../../shared/contracts/files';

const PAGE_SIZE = 20;

/**
 * How many list views keep their loaded pages in memory.
 */
const MAX_REMEMBERED_LISTS = 10;

interface UseInfiniteAssetsOptions {
  folder?: number | null;
  sort?: string;
  search?: string;
  /** Extra `filters[$and]` entries for the files query. */
  filters?: Record<string, unknown>[];
  /** Structural switch: an `is [folder]`-only type badge means no file can match. */
  enabled?: boolean;
}

interface QueryArgs {
  folder: number | null;
  sort?: string;
  search?: string;
  filters?: Record<string, unknown>[];
}

/**
 * Everything loaded for one query identity.
 *
 * `queryKey` lags the live key while a new query is in flight — that lag is
 * what keeps the previous results on screen across a search change.
 */
interface Accumulated {
  queryKey: string;
  listKey: string;
  pages: Record<number, File[]>;
  pagination?: Pagination;
}

interface PageState {
  queryKey: string;
  page: number;
}

type PageRefreshedHandler = (page: number, results: File[]) => void;

/**
 * Concatenates the pages in ascending order, one entry per asset id.
 *
 * `Map.set` keeps the first insertion position but takes the latest value, so
 * an asset that moved between pages after a mutation holds its place and shows
 * fresh data instead of rendering twice under a duplicate key.
 */
const flattenPages = (pages: Record<number, File[]>): File[] => {
  const byId = new Map<number, File>();

  for (const page of Object.keys(pages)
    .map(Number)
    .sort((a, b) => a - b)) {
    for (const asset of pages[page]) {
      byId.set(asset.id, asset);
    }
  }

  return [...byId.values()];
};

/**
 * The highest page an accumulator holds — where the list was last read to, and
 * so where to resume from on the way back.
 */
const deepestPage = (pages: Record<number, File[]>): number =>
  Object.keys(pages).reduce((deepest, key) => Math.max(deepest, Number(key)), 1);

/**
 * Keeps one earlier page's `getAssets` query subscribed and reports its results
 * back up whenever they change.
 *
 * The hook itself only subscribes the current (latest) page. Without these, a
 * mutation invalidating `{Asset, LIST}` refetches that page alone and earlier
 * pages stay frozen — a rename or delete on an earlier page never reaches the
 * list until a folder/sort/search change. One subscriber per earlier
 * page keeps them all subscribed so the invalidation refetches the whole list.
 * Renders nothing; it exists only for the subscription + `onRefreshed` report.
 */
const PageSubscriber = ({
  queryArgs,
  page,
  onRefreshed,
}: {
  queryArgs: QueryArgs;
  page: number;
  onRefreshed: PageRefreshedHandler;
}) => {
  const { currentData } = useGetAssetsQuery({ ...queryArgs, page, pageSize: PAGE_SIZE });
  const results = currentData?.results;

  useEffect(() => {
    if (results) {
      onRefreshed(page, results);
    }
    // `results` is a stable reference per cache entry, so this only re-reports
    // when a refetch actually replaces the page's data. Reporting the same
    // reference the accumulator already holds is a no-op (see `onRefreshed`).
  }, [results, page, onRefreshed]);

  return null;
};

/**
 * Infinite scroll over `/upload/files`, keeping one accumulated slot per page.
 *
 * The caller MUST render the returned `subscribers` node — that is what keeps
 * every loaded page subscribed, so `{Asset, LIST}` invalidations keep the whole
 * list consistent rather than only the current page.
 *
 * Loaded pages survive navigating away and back: each list's accumulator is
 * remembered (LRU, `MAX_REMEMBERED_LISTS`) and restored when its key returns, so
 * stepping into a subfolder and back out keeps the rows the user scrolled for.
 */
const useInfiniteAssets = ({
  folder = null,
  sort,
  search,
  filters,
  enabled = true,
}: UseInfiniteAssetsOptions = {}) => {
  // Derived from the request args themselves, so a new filter can't reach the
  // API without also invalidating what was accumulated under the old one.
  const queryArgs: QueryArgs = { folder, sort, search, filters };
  const queryKey = JSON.stringify(queryArgs);
  // Identifies the list being viewed, ignoring the search term. Folder, sort
  // and filter changes are single committed actions, so one clean reset per
  // change is honest. Search is committed per keystroke on a 300ms debounce,
  // and blanking the list on each one would strobe as the user types.
  // The cost: through the search window the previous rows stay rendered and
  // `hasNextPage` is false, so the list reads as complete until page 1 lands.
  const listKey = JSON.stringify({ folder, sort, filters });

  const [pageState, setPageState] = useState<PageState>({ queryKey, page: 1 });
  const [accumulated, setAccumulated] = useState<Accumulated>({ queryKey, listKey, pages: {} });

  // Each list's loaded pages, kept across navigation away from it.
  const memoryRef = useRef(new Map<string, Accumulated>());

  const isNewList = pageState.queryKey !== queryKey;

  const remembered = isNewList ? memoryRef.current.get(queryKey) : undefined;

  // Derived rather than read from state: the render that discovers the key
  // change still reaches the query below, and a list with no page 1 must never
  // be requested at page 2. A remembered list always holds page 1, so resuming
  // at its deepest page can't skip one.
  let page: number;
  if (!isNewList) {
    page = pageState.page;
  } else if (remembered) {
    page = deepestPage(remembered.pages);
  } else {
    page = 1;
  }

  if (isNewList) {
    setPageState({ queryKey, page });

    if (remembered) {
      setAccumulated(remembered);
    }
  }

  const { currentData, isLoading, isFetching, error, startedTimeStamp, fulfilledTimeStamp } =
    useGetAssetsQuery(
      {
        ...queryArgs,
        page,
        pageSize: PAGE_SIZE,
      },
      { skip: !enabled }
    );

  const isSameQuery = accumulated.queryKey === queryKey;

  // `currentData` is only ever the payload for the args just passed, so it
  // belongs to this key at this page — nothing to infer. Its reference is
  // stable per cache entry, so this settles after one extra render.
  if (
    // A restore already set the accumulator from memory; don't overwrite it.
    !remembered &&
    currentData &&
    (!isSameQuery || accumulated.pages[page] !== currentData.results)
  ) {
    setAccumulated(
      isSameQuery
        ? {
            ...accumulated,
            pages: { ...accumulated.pages, [page]: currentData.results },
            pagination: currentData.pagination,
          }
        : {
            queryKey,
            listKey,
            pages: { [page]: currentData.results },
            pagination: currentData.pagination,
          }
    );
  }

  // Merges a refetched earlier page back into the accumulator. Ignores reports
  // for a superseded query, and no-ops when the reference is unchanged so a
  // subscriber re-reporting its already-stored page can't loop.
  const handlePageRefreshed = useCallback<PageRefreshedHandler>(
    (refreshedPage, results) => {
      setAccumulated((prev) => {
        if (prev.queryKey !== queryKey || prev.pages[refreshedPage] === results) {
          return prev;
        }

        return { ...prev, pages: { ...prev.pages, [refreshedPage]: results } };
      });
    },
    [queryKey]
  );

  // One subscriber per earlier page (the current page is already subscribed by
  // the query above). Keyed by queryKey so a folder/sort/search change remounts
  // them against the new args instead of reusing a stale cache entry.
  // `createElement` rather than JSX so this stays a plain `.ts` hook file.
  const subscribers = createElement(
    Fragment,
    null,
    Array.from({ length: Math.max(0, page - 1) }, (_, index) => index + 1).map((earlierPage) =>
      createElement(PageSubscriber, {
        key: `${queryKey}:${earlierPage}`,
        queryArgs,
        page: earlierPage,
        onRefreshed: handlePageRefreshed,
      })
    )
  );

  // Remember what this list has read, so leaving it isn't forgetting it. Filed
  // under `accumulated.queryKey`, not the live `queryKey`: the accumulator names
  // the list it belongs to, so an entry still describing the list being left
  // can't be misfiled under the one being entered.
  useEffect(() => {
    if (Object.keys(accumulated.pages).length === 0) {
      return;
    }

    const memory = memoryRef.current;
    // Delete before set so the entry moves to the end. Map iterates in
    // insertion order, so the first key is the least recently used.
    memory.delete(accumulated.queryKey);
    memory.set(accumulated.queryKey, accumulated);

    while (memory.size > MAX_REMEMBERED_LISTS) {
      const oldest = memory.keys().next();

      if (oldest.done) {
        break;
      }

      memory.delete(oldest.value);
    }
  }, [accumulated]);

  // Drop the left folder's cached `getAssets` pages when the folder changes.
  //
  // RTK Query 1.9.7 leaves a query's store subscription in place when its last
  // subscriber unmounts while a refetch is still in flight — e.g. a delete
  // invalidates `{Asset, LIST}`, every loaded page starts refetching, and the
  // user navigates away before those settle. Those stale subscriptions make the
  // next `{Asset, LIST}` invalidation (an upload in the new folder) refetch the
  // *previous* folder's pages: one bogus `/upload/files` request per loaded
  // page. There is no public per-entry unsubscribe, so evict the left folder's
  // entries outright. Returning then re-reads every page it had loaded, but the
  // rows come straight back from the accumulator memory above — so those
  // requests refresh a list already on screen rather than being waited on.
  const dispatch = useDispatch();
  const store = useStore();
  const prevFolderRef = useRef(folder);
  useEffect(() => {
    const prevFolder = prevFolderRef.current;
    prevFolderRef.current = folder;
    if (prevFolder === folder) {
      return;
    }

    const apiState = (store.getState() as Record<string, { queries?: Record<string, unknown> }>)[
      uploadApi.reducerPath
    ];
    const removeQueryResult = (
      uploadApi as unknown as {
        internalActions: {
          removeQueryResult: (payload: { queryCacheKey: string }) => { type: string };
        };
      }
    ).internalActions.removeQueryResult;

    Object.keys(apiState?.queries ?? {}).forEach((cacheKey) => {
      if (!cacheKey.startsWith('getAssets(')) {
        return;
      }
      let args: { folder?: number | null };
      try {
        args = JSON.parse(cacheKey.slice('getAssets('.length, -1));
      } catch {
        return;
      }
      if (args.folder === prevFolder) {
        dispatch(removeQueryResult({ queryCacheKey: cacheKey }));
      }
    });
  }, [folder, dispatch, store]);

  // Until the new list's first page lands the accumulator still holds the
  // previous folder. Reported as loading so the page shows a spinner instead
  // of the outgoing folder's assets under the incoming folder's header.
  const isChangingList = accumulated.listKey !== listKey;

  const loadedAssets = useMemo(
    () => (isChangingList ? [] : flattenPages(accumulated.pages)),
    [isChangingList, accumulated.pages]
  );

  // Deliberately the live value, not the stale-tolerant one below: paging must
  // never be driven by a total that belongs to the previous query.
  const hasNextPage = currentData ? page < currentData.pagination.pageCount : false;

  const completedUploads = useTypedSelector(selectCompletedUploads);

  // Only an unfiltered, unsearched list can place an upload locally: deciding
  // whether an asset satisfies a filter means reimplementing the server's
  // filter semantics client-side. Filtered views still refresh on the
  // end-of-batch invalidation, as they did before.
  const canPlaceUploads = !search && (filters?.length ?? 0) === 0;

  // When the loaded data came back from a request that started after a given
  // upload — i.e. the server had already stored it when asked. Past that point
  // the list is the authority on whether the asset is there at all, so bridging
  // must stop: otherwise a later delete or move, which refetches without it,
  // would have it re-inserted.
  const listAnsweredAfter =
    fulfilledTimeStamp !== undefined &&
    startedTimeStamp !== undefined &&
    // A refetch in flight leaves `fulfilledTimeStamp` on the previous response,
    // which predates this request — so only settled data counts.
    fulfilledTimeStamp > startedTimeStamp
      ? startedTimeStamp
      : undefined;

  const assets = useMemo(() => {
    if (!canPlaceUploads || completedUploads.length === 0) {
      return loadedAssets;
    }

    const bridging = completedUploads.filter(
      ({ asset, completedAt }) =>
        getRelationId(asset.folder) === folder &&
        (listAnsweredAfter === undefined || completedAt > listAnsweredAfter)
    );

    return mergeUploadedAssets({
      assets: loadedAssets,
      uploaded: bridging.map(({ asset }) => asset),
      sort,
      hasNextPage,
    });
  }, [
    canPlaceUploads,
    completedUploads,
    loadedAssets,
    folder,
    sort,
    hasNextPage,
    listAnsweredAfter,
  ]);
  const isFetchingMore = isFetching && page > 1;

  // A restored list already has rows on screen, so re-reading its current page
  // is a background refresh — reporting it as loading would swap those rows for
  // a spinner. Only an empty list has nothing better to show.
  const isLoadingList = isChangingList || (isLoading && assets.length === 0);

  const fetchNextPage = useCallback(() => {
    setPageState((prev) => ({
      queryKey,
      page: (prev.queryKey === queryKey ? prev.page : 1) + 1,
    }));
  }, [queryKey]);

  if (!enabled) {
    return {
      assets: [] as File[],
      // No list to keep fresh while disabled, so nothing to subscribe.
      subscribers: null,
      pagination: undefined,
      isLoading: false,
      isFetchingMore: false,
      hasNextPage: false,
      fetchNextPage,
      error: undefined,
    };
  }

  return {
    assets,
    subscribers,
    // Falls back to the accumulated total so a consumer showing the count
    // doesn't flash zero mid-transition, matching the possibly stale `assets`.
    pagination: currentData?.pagination ?? accumulated.pagination,
    isLoading: isLoadingList,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error,
  };
};

export { useInfiniteAssets };
export { PAGE_SIZE };
