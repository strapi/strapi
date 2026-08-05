import { createElement, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatch, useStore } from 'react-redux';

import { uploadApi } from '../../../services/api';
import { useGetAssetsQuery } from '../../../services/assets';

import type { File, Pagination } from '../../../../../../shared/contracts/files';

const PAGE_SIZE = 20;

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

  // Derived rather than read straight from state: the render that discovers
  // the key change still reaches the query below, and a list with no page 1
  // must never be requested at page 2.
  const page = pageState.queryKey === queryKey ? pageState.page : 1;

  if (pageState.queryKey !== queryKey) {
    setPageState({ queryKey, page: 1 });
  }

  const { currentData, isLoading, isFetching, error } = useGetAssetsQuery(
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
  if (currentData && (!isSameQuery || accumulated.pages[page] !== currentData.results)) {
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

  // Drop the left folder's cached `getAssets` pages when the folder changes.
  //
  // RTK Query 1.9.7 leaves a query's store subscription in place when its last
  // subscriber unmounts while a refetch is still in flight — e.g. a delete
  // invalidates `{Asset, LIST}`, every loaded page starts refetching, and the
  // user navigates away before those settle. Those stale subscriptions make the
  // next `{Asset, LIST}` invalidation (an upload in the new folder) refetch the
  // *previous* folder's pages: one bogus `/upload/files` request per loaded
  // page. There is no public per-entry unsubscribe, so evict the left folder's
  // entries outright — returning reloads from page 1, which the accumulator
  // already does on a list change.
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

  const assets = useMemo(
    () => (isChangingList ? [] : flattenPages(accumulated.pages)),
    [isChangingList, accumulated.pages]
  );

  // Deliberately the live value, not the stale-tolerant one below: paging must
  // never be driven by a total that belongs to the previous query.
  const hasNextPage = currentData ? page < currentData.pagination.pageCount : false;
  const isFetchingMore = isFetching && page > 1;

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
    isLoading: isLoading || isChangingList,
    isFetchingMore,
    hasNextPage,
    fetchNextPage,
    error,
  };
};

export { useInfiniteAssets };
export { PAGE_SIZE };
