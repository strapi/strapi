import { useState, createElement } from 'react';

import { renderHook, render, act, waitFor } from '@tests/utils';

import { useInfiniteAssets, PAGE_SIZE } from '../useInfiniteAssets';

import type { File, Pagination } from '../../../../../../../shared/contracts/files';

const mockUseGetAssetsQuery = jest.fn();

jest.mock('../../../../services/assets', () => ({
  useGetAssetsQuery: (...args: unknown[]) => mockUseGetAssetsQuery(...args),
}));

const createMockAsset = (id: number): File => ({
  id,
  name: `asset-${id}.png`,
  hash: `hash_${id}`,
  ext: '.png',
  mime: 'image/png',
  url: `http://example.com/asset-${id}.png`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const createMockPage = (
  page: number,
  pageCount: number,
  total: number,
  resultsCount: number = PAGE_SIZE
) => {
  const startId = (page - 1) * PAGE_SIZE + 1;
  const results = Array.from({ length: resultsCount }, (_, i) => createMockAsset(startId + i));
  const pagination: Pagination = { page, pageSize: PAGE_SIZE, pageCount, total };

  const data = { results, pagination };

  return { data, currentData: data, isLoading: false, isFetching: false, error: undefined };
};

/**
 * The same asset ids behind new references and with a renamed field — what a
 * `{Asset, LIST}` invalidation refetch hands back for a page that is already
 * accumulated. The rename makes it observable whether the slot was refreshed
 * or the stale copy kept.
 */
const asRefetch = ({ data }: ReturnType<typeof createMockPage>) => {
  const refetched = {
    results: data.results.map((asset) => ({ ...asset, name: `refetched-${asset.name}` })),
    pagination: { ...data.pagination },
  };

  return {
    data: refetched,
    currentData: refetched,
    isLoading: false,
    isFetching: false,
    error: undefined,
  };
};

const PENDING_QUERY = {
  data: undefined,
  currentData: undefined,
  isLoading: true,
  isFetching: true,
  error: undefined,
};

/**
 * The render right after an args change, before RTK Query's subscription effect
 * has run: the cache entry for the new args doesn't exist yet, so the query
 * reports neither data nor loading. This is the frame in which the outgoing
 * folder's assets used to appear under the incoming folder's header.
 */
const UNINITIALIZED_QUERY = {
  data: undefined,
  currentData: undefined,
  isLoading: false,
  isFetching: false,
  error: undefined,
};

/**
 * Drives the hook through a folder change, which is the transition the
 * accumulator has to reset across. `forceRerender` lets a test flip the mocked
 * query response and observe the hook picking it up.
 */
const renderWithFolder = () => {
  let hookResult: ReturnType<typeof useInfiniteAssets>;
  let setFolder: (folder: number | null) => void;
  let bumpTick: () => void;

  const FolderTestWrapper = () => {
    const [folder, setFolderState] = useState<number | null>(null);
    const [, setTick] = useState(0);

    hookResult = useInfiniteAssets({ folder });
    setFolder = setFolderState;
    bumpTick = () => setTick((tick) => tick + 1);

    return null;
  };

  render(createElement(FolderTestWrapper));

  return {
    getResult: () => hookResult,
    changeFolder: (folder: number | null) =>
      act(() => {
        setFolder(folder);
      }),
    forceRerender: () =>
      act(() => {
        bumpTick();
      }),
  };
};

describe('useInfiniteAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns first page of assets on initial load', () => {
    const page1 = createMockPage(1, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page1);

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.assets).toHaveLength(PAGE_SIZE);
    expect(result.current.assets[0].id).toBe(1);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns loading state when query is loading', () => {
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
    });

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.assets).toHaveLength(0);
  });

  it('fetches with page 1 and correct pageSize', () => {
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
    });

    renderHook(() => useInfiniteAssets());

    expect(mockUseGetAssetsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: PAGE_SIZE }),
      expect.anything()
    );
  });

  it('increments page when fetchNextPage is called', () => {
    const page1 = createMockPage(1, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page1);

    const { result } = renderHook(() => useInfiniteAssets());

    act(() => {
      result.current.fetchNextPage();
    });

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: PAGE_SIZE }),
      expect.anything()
    );
  });

  it('accumulates results across pages', () => {
    const page1Response = createMockPage(1, 4, 70);
    const page2Response = createMockPage(2, 4, 70);
    const page3Response = createMockPage(3, 4, 70);

    mockUseGetAssetsQuery.mockImplementation(({ page: p }: { page: number }) => {
      if (p === 2) {
        return page2Response;
      }

      if (p === 3) {
        return page3Response;
      }

      return page1Response;
    });

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.assets).toHaveLength(PAGE_SIZE);

    // Fetch page 2
    act(() => {
      result.current.fetchNextPage();
    });

    // Fetch page 3 — pages 2 and 3 should accumulate
    act(() => {
      result.current.fetchNextPage();
    });

    expect(result.current.assets).toHaveLength(PAGE_SIZE * 3);
    expect(result.current.assets[0].id).toBe(1);
    expect(result.current.assets[PAGE_SIZE].id).toBe(PAGE_SIZE + 1);
    expect(result.current.assets[PAGE_SIZE * 2].id).toBe(PAGE_SIZE * 2 + 1);
  });

  it('hasNextPage is false when on last page', () => {
    // Single page of results — pageCount is 1, hook is on page 1
    const singlePage = createMockPage(1, 1, 10, 10);
    mockUseGetAssetsQuery.mockReturnValue(singlePage);

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.hasNextPage).toBe(false);
  });

  it('hasNextPage is true when not on last page', () => {
    const page1 = createMockPage(1, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page1);

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.hasNextPage).toBe(true);
  });

  it('passes sort parameter to query', () => {
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
    });

    renderHook(() => useInfiniteAssets({ sort: 'createdAt:DESC' }));

    expect(mockUseGetAssetsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'createdAt:DESC' }),
      expect.anything()
    );
  });

  it('resets to page 1 when sort changes', async () => {
    const page1 = createMockPage(1, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page1);

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let changeSort: () => void;

    const SortTestWrapper = () => {
      const [sort, setSort] = useState<string | undefined>(undefined);
      hookResult = useInfiniteAssets({ sort });
      changeSort = () => setSort('name:ASC');

      return null;
    };

    render(createElement(SortTestWrapper));

    // Go to page 2
    act(() => {
      hookResult.fetchNextPage();
    });

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    );

    // Change sort — triggers useEffect that resets page to 1
    act(() => {
      changeSort();
    });

    await waitFor(() => {
      expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, sort: 'name:ASC' }),
        expect.anything()
      );
    });
  });

  it('reports isFetchingMore only when fetching subsequent pages', () => {
    // Page 1 fetching — not "fetchingMore"
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
    });

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.isFetchingMore).toBe(false);
  });

  it('passes search parameter to query', () => {
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: true,
      isFetching: true,
      error: undefined,
    });

    renderHook(() => useInfiniteAssets({ search: 'kitten' }));

    expect(mockUseGetAssetsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'kitten' }),
      expect.anything()
    );
  });

  it('resets to page 1 when the search term changes', async () => {
    mockUseGetAssetsQuery.mockReturnValue(createMockPage(1, 3, 50));

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let changeSearch: () => void;

    const SearchTestWrapper = () => {
      const [search, setSearch] = useState<string | undefined>(undefined);
      hookResult = useInfiniteAssets({ search });
      changeSearch = () => setSearch('kitten');

      return null;
    };

    render(createElement(SearchTestWrapper));

    act(() => {
      hookResult.fetchNextPage();
    });

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    );

    act(() => {
      changeSearch();
    });

    await waitFor(() => {
      expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, search: 'kitten' }),
        expect.anything()
      );
    });
  });

  it('keeps the previous assets rendered while the new search query is in flight', async () => {
    // RTK Query drops `currentData` during an arg change, so the hook has to
    // fall back to the last results — otherwise the list blanks on every
    // settled keystroke.
    const page1 = createMockPage(1, 3, 50);

    mockUseGetAssetsQuery.mockImplementation(({ search }: { search?: string }) =>
      search
        ? {
            data: page1.data,
            currentData: undefined,
            isLoading: false,
            isFetching: true,
            error: undefined,
          }
        : page1
    );

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let changeSearch: () => void;

    const SearchTestWrapper = () => {
      const [search, setSearch] = useState<string | undefined>(undefined);
      hookResult = useInfiniteAssets({ search });
      changeSearch = () => setSearch('kitten');

      return null;
    };

    render(createElement(SearchTestWrapper));

    expect(hookResult!.assets).toHaveLength(PAGE_SIZE);

    act(() => {
      changeSearch();
    });

    await waitFor(() => {
      expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'kitten' }),
        expect.anything()
      );
    });

    expect(hookResult!.assets).toHaveLength(PAGE_SIZE);
  });

  it('keeps reporting the previous total while the new search query is in flight', async () => {
    // The header renders this total, so dropping to undefined mid-transition
    // would flash "0 items" on every settled keystroke.
    const page1 = createMockPage(1, 3, 50);

    mockUseGetAssetsQuery.mockImplementation(({ search }: { search?: string }) =>
      search
        ? {
            data: page1.data,
            currentData: undefined,
            isLoading: false,
            isFetching: true,
            error: undefined,
          }
        : page1
    );

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let changeSearch: () => void;

    const SearchTestWrapper = () => {
      const [search, setSearch] = useState<string | undefined>(undefined);
      hookResult = useInfiniteAssets({ search });
      changeSearch = () => setSearch('kitten');

      return null;
    };

    render(createElement(SearchTestWrapper));

    expect(hookResult!.pagination?.total).toBe(50);

    act(() => {
      changeSearch();
    });

    await waitFor(() => {
      expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'kitten' }),
        expect.anything()
      );
    });

    expect(hookResult!.pagination?.total).toBe(50);
  });

  it('replaces accumulated results when the new search page 1 arrives', async () => {
    const unsearchedPage1 = createMockPage(1, 3, 50);
    const unsearchedPage2 = createMockPage(2, 3, 50);
    // Search results are a different, shorter set starting at a distinct id.
    const searchResults = {
      data: {
        results: [createMockAsset(900), createMockAsset(901)],
        pagination: { page: 1, pageSize: PAGE_SIZE, pageCount: 1, total: 2 },
      },
      isLoading: false,
      isFetching: false,
      error: undefined,
    };

    mockUseGetAssetsQuery.mockImplementation(
      ({ page: p, search }: { page: number; search?: string }) => {
        if (search) {
          return { ...searchResults, currentData: searchResults.data };
        }

        return p === 2 ? unsearchedPage2 : unsearchedPage1;
      }
    );

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let changeSearch: () => void;

    const SearchTestWrapper = () => {
      const [search, setSearch] = useState<string | undefined>(undefined);
      hookResult = useInfiniteAssets({ search });
      changeSearch = () => setSearch('kitten');

      return null;
    };

    render(createElement(SearchTestWrapper));

    act(() => {
      hookResult.fetchNextPage();
    });

    expect(hookResult!.assets).toHaveLength(PAGE_SIZE * 2);

    act(() => {
      changeSearch();
    });

    await waitFor(() => {
      expect(hookResult!.assets).toHaveLength(2);
    });

    expect(hookResult!.assets.map(({ id }) => id)).toEqual([900, 901]);
  });

  it('never requests page 2 for a list that has no page 1', () => {
    const rootPage1 = createMockPage(1, 3, 50);
    const rootPage2 = createMockPage(2, 3, 50);

    mockUseGetAssetsQuery.mockImplementation(
      ({ folder, page: p }: { folder: number | null; page: number }) => {
        if (folder !== null) {
          return PENDING_QUERY;
        }

        return p === 2 ? rootPage2 : rootPage1;
      }
    );

    const { getResult, changeFolder } = renderWithFolder();

    act(() => {
      getResult().fetchNextPage();
    });

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    );

    changeFolder(26);

    const folderCalls = mockUseGetAssetsQuery.mock.calls
      .map(([args]) => args as { folder: number | null; page: number })
      .filter(({ folder }) => folder === 26);

    expect(folderCalls.length).toBeGreaterThan(0);
    expect(folderCalls.every(({ page: p }) => p === 1)).toBe(true);
  });

  it('overwrites a page slot when it is re-read', () => {
    const page1 = createMockPage(1, 3, 50);
    const page2 = createMockPage(2, 3, 50);
    const page2Refetched = asRefetch(page2);

    let hasRefetched = false;

    mockUseGetAssetsQuery.mockImplementation(({ page: p }: { page: number }) => {
      if (p === 2) {
        return hasRefetched ? page2Refetched : page2;
      }

      return page1;
    });

    const { result, rerender } = renderHook(() => useInfiniteAssets());

    act(() => {
      result.current.fetchNextPage();
    });

    expect(result.current.assets).toHaveLength(PAGE_SIZE * 2);

    hasRefetched = true;
    rerender();

    expect(result.current.assets).toHaveLength(PAGE_SIZE * 2);
    // The slot was replaced, not held: the refreshed copy is what renders.
    expect(result.current.assets[PAGE_SIZE].name).toMatch(/^refetched-/);
  });

  it('refreshes an earlier page after a mutation refetch so a rename reaches the list', async () => {
    // Page 1 is accumulated, then page 2 becomes the current page — so page 1 is
    // no longer the subscribed query. A rename on a page-1 asset invalidates
    // `{Asset, LIST}`; only the rendered `subscribers` keep page 1 subscribed so
    // that refetch actually reaches the accumulated list.
    const page1 = createMockPage(1, 2, 40);
    const page2 = createMockPage(2, 2, 40);
    const page1Refetched = asRefetch(page1);

    let hasRenamed = false;

    mockUseGetAssetsQuery.mockImplementation(({ page: p }: { page: number }) => {
      if (p === 1) {
        return hasRenamed ? page1Refetched : page1;
      }

      return page2;
    });

    let hookResult: ReturnType<typeof useInfiniteAssets>;
    let bumpTick: () => void;

    const SubscribedWrapper = () => {
      const [, setTick] = useState(0);
      hookResult = useInfiniteAssets();
      bumpTick = () => setTick((tick) => tick + 1);

      // Rendering the subscribers node is what keeps every loaded page
      // subscribed — the fix under test.
      return hookResult.subscribers;
    };

    render(createElement(SubscribedWrapper));

    act(() => {
      hookResult!.fetchNextPage();
    });

    expect(hookResult!.assets).toHaveLength(PAGE_SIZE * 2);
    expect(hookResult!.assets[0].name).not.toMatch(/^refetched-/);

    // The invalidation refetches the subscribed page-1 query with renamed data.
    hasRenamed = true;
    await act(async () => {
      bumpTick();
    });

    await waitFor(() => {
      expect(hookResult!.assets[0].name).toMatch(/^refetched-/);
    });
    // Page 2 (the current page) is untouched by the page-1 refresh.
    expect(hookResult!.assets[PAGE_SIZE].name).not.toMatch(/^refetched-/);
  });

  it('does not duplicate a short final page', () => {
    // 20 + 6: the accumulated length never reaches `page * PAGE_SIZE`, which is
    // what used to let a re-read append the final page a second time.
    const page1 = createMockPage(1, 2, 26);
    const shortPage2 = createMockPage(2, 2, 26, 6);
    const shortPage2Refetched = asRefetch(shortPage2);

    let hasRefetched = false;

    mockUseGetAssetsQuery.mockImplementation(({ page: p }: { page: number }) => {
      if (p === 2) {
        return hasRefetched ? shortPage2Refetched : shortPage2;
      }

      return page1;
    });

    const { result, rerender } = renderHook(() => useInfiniteAssets());

    act(() => {
      result.current.fetchNextPage();
    });

    expect(result.current.assets).toHaveLength(26);

    hasRefetched = true;
    rerender();

    expect(result.current.assets).toHaveLength(26);
  });

  it('reports isLoading while the folder changes and clears once its first page lands', () => {
    const rootPage1 = createMockPage(1, 3, 50);
    const folderPage1 = createMockPage(1, 1, 2, 2);

    let hasFolderResolved = false;

    mockUseGetAssetsQuery.mockImplementation(({ folder }: { folder: number | null }) => {
      if (folder === null) {
        return rootPage1;
      }

      return hasFolderResolved ? folderPage1 : UNINITIALIZED_QUERY;
    });

    const { getResult, changeFolder, forceRerender } = renderWithFolder();

    expect(getResult().isLoading).toBe(false);

    changeFolder(26);

    expect(getResult().isLoading).toBe(true);

    hasFolderResolved = true;
    forceRerender();

    expect(getResult().isLoading).toBe(false);
    expect(getResult().assets).toHaveLength(2);
  });

  it('returns no assets from the previous folder while the folder is changing', () => {
    const rootPage1 = createMockPage(1, 3, 50);

    mockUseGetAssetsQuery.mockImplementation(({ folder }: { folder: number | null }) =>
      folder === null ? rootPage1 : UNINITIALIZED_QUERY
    );

    const { getResult, changeFolder } = renderWithFolder();

    expect(getResult().assets).toHaveLength(PAGE_SIZE);

    changeFolder(26);

    expect(getResult().assets).toHaveLength(0);
    // The total is deliberately still reported so the header doesn't flash zero.
    expect(getResult().pagination?.total).toBe(50);
  });

  it('renders an asset that appears in two pages once, in its first position', () => {
    const page1 = createMockPage(1, 2, 25);
    // A row shifted across the page boundary after a mutation, so page 2 now
    // opens with the asset that was last on page 1.
    const overlapping = {
      results: [createMockAsset(PAGE_SIZE), createMockAsset(PAGE_SIZE + 1)],
      pagination: { page: 2, pageSize: PAGE_SIZE, pageCount: 2, total: 25 },
    };
    const overlappingPage2 = {
      data: overlapping,
      currentData: overlapping,
      isLoading: false,
      isFetching: false,
      error: undefined,
    };

    mockUseGetAssetsQuery.mockImplementation(({ page: p }: { page: number }) =>
      p === 2 ? overlappingPage2 : page1
    );

    const { result } = renderHook(() => useInfiniteAssets());

    act(() => {
      result.current.fetchNextPage();
    });

    const ids = result.current.assets.map(({ id }) => id);

    expect(ids).toHaveLength(PAGE_SIZE + 1);
    expect(ids.filter((id) => id === PAGE_SIZE)).toHaveLength(1);
    expect(ids[PAGE_SIZE - 1]).toBe(PAGE_SIZE);
  });

  it('returns error from query', () => {
    const mockError = { status: 500, data: 'Server error' };
    mockUseGetAssetsQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isLoading: false,
      isFetching: false,
      error: mockError,
    });

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.error).toBe(mockError);
  });
});
