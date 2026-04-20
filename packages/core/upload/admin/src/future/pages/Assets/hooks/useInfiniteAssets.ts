import { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { useGetAssetsQuery } from '../../../services/assets';

import type { File } from '../../../../../../shared/contracts/files';

const PAGE_SIZE = 20;

interface UseInfiniteAssetsOptions {
  folder?: number | null;
  sort?: string;
}

const useInfiniteAssets = ({ folder = null, sort }: UseInfiniteAssetsOptions = {}) => {
  const [page, setPage] = useState(1);
  const lastResultsRef = useRef<File[]>([]);
  const isMountRef = useRef(true);

  const {
    currentData: data,
    isLoading,
    isFetching,
    error,
  } = useGetAssetsQuery({
    folder,
    page,
    pageSize: PAGE_SIZE,
    sort,
  });

  const pagination = data?.pagination;

  // Accumulate pages. When cache is invalidated the current page is refetched
  // detect this and reset to avoid a gap in the results.
  const assets = useMemo(() => {
    if (!data) {
      return lastResultsRef.current;
    }

    const currentPageResults = data.results;

    if (page === 1) {
      lastResultsRef.current = currentPageResults;
    } else {
      // If accumulated length doesn't match expectation, cache was cleared
      const expectedPrior = (page - 1) * PAGE_SIZE;
      if (lastResultsRef.current.length < expectedPrior - PAGE_SIZE) {
        return lastResultsRef.current;
      }

      // Only append if these aren't already accumulated
      if (lastResultsRef.current.length < page * PAGE_SIZE) {
        lastResultsRef.current = [...lastResultsRef.current, ...currentPageResults];
      }
    }

    return lastResultsRef.current;
  }, [data, page]);

  // Reset on filter/sort change — skip the initial mount since the memo
  // already handles page 1 correctly
  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;

      return;
    }
    setPage(1);
    lastResultsRef.current = [];
  }, [folder, sort]);

  const hasNextPage = pagination ? page < pagination.pageCount : false;
  const isFetchingMore = isFetching && page > 1;

  const fetchNextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  return { assets, pagination, isLoading, isFetchingMore, hasNextPage, fetchNextPage, error };
};

export { useInfiniteAssets };
export { PAGE_SIZE };
