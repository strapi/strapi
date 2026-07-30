import { useCallback, useMemo, useState } from 'react';

import { useGetAssetsQuery } from '../../../services/assets';

import type { File, Pagination } from '../../../../../../shared/contracts/files';

const PAGE_SIZE = 20;

interface UseInfiniteAssetsOptions {
  folder?: number | null;
  sort?: string;
  search?: string;
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
 * Infinite scroll over `/upload/files`, keeping one accumulated slot per page.
 *
 * Known limitation: only the current page is subscribed, so a mutation
 * invalidating `{Asset, LIST}` refetches that page alone. Earlier pages are
 * detached copies and can go stale — a deleted asset lingers, a new upload
 * never appears, rows shift across the page boundary. The id dedupe above
 * keeps that from producing duplicate React keys or confusing
 * `useAssetSelection`, but the list only becomes consistent again on the next
 * folder/sort/search change.
 */
const useInfiniteAssets = ({ folder = null, sort, search }: UseInfiniteAssetsOptions = {}) => {
  // Derived from the request args themselves, so a new filter can't reach the
  // API without also invalidating what was accumulated under the old one.
  const queryArgs = { folder, sort, search };
  const queryKey = JSON.stringify(queryArgs);
  // Identifies the list being viewed, ignoring the search term — a search
  // keeps the previous results on screen, a folder or sort change doesn't.
  const listKey = JSON.stringify({ folder, sort });

  const [pageState, setPageState] = useState<PageState>({ queryKey, page: 1 });
  const [accumulated, setAccumulated] = useState<Accumulated>({ queryKey, listKey, pages: {} });

  // Derived rather than read straight from state: the render that discovers
  // the key change still reaches the query below, and a list with no page 1
  // must never be requested at page 2.
  const page = pageState.queryKey === queryKey ? pageState.page : 1;

  if (pageState.queryKey !== queryKey) {
    setPageState({ queryKey, page: 1 });
  }

  const { currentData, isLoading, isFetching, error } = useGetAssetsQuery({
    ...queryArgs,
    page,
    pageSize: PAGE_SIZE,
  });

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

  return {
    assets,
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
