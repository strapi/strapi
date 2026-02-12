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
      expect.objectContaining({ page: 1, pageSize: PAGE_SIZE })
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
      expect.objectContaining({ page: 2, pageSize: PAGE_SIZE })
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
      expect.objectContaining({ sort: 'createdAt:DESC' })
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

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    // Change sort — triggers useEffect that resets page to 1
    act(() => {
      changeSort();
    });

    await waitFor(() => {
      expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, sort: 'name:ASC' })
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
