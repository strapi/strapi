import { renderHook, act, waitFor } from '@tests/utils';

import { useInfiniteAssets, PAGE_SIZE } from '../useInfiniteAssets';

import type { File, Pagination } from '../../../../../shared/contracts/files';

const mockUseGetAssetsQuery = jest.fn();

jest.mock('../../services/assets', () => ({
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

  return { data: { results, pagination }, isLoading: false, isFetching: false, error: undefined };
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
    // Start with page 1
    const page1 = createMockPage(1, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page1);

    const { result, rerender } = renderHook(() => useInfiniteAssets());

    expect(result.current.assets).toHaveLength(PAGE_SIZE);

    // Simulate fetchNextPage and page 2 response
    act(() => {
      result.current.fetchNextPage();
    });

    const page2 = createMockPage(2, 3, 50);
    mockUseGetAssetsQuery.mockReturnValue(page2);
    rerender();

    expect(result.current.assets).toHaveLength(PAGE_SIZE * 2);
    expect(result.current.assets[0].id).toBe(1);
    expect(result.current.assets[PAGE_SIZE].id).toBe(PAGE_SIZE + 1);
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

    // eslint-disable-next-line prefer-const
    let sort: string | undefined;
    const { result, rerender } = renderHook(() => useInfiniteAssets({ sort }));

    // Go to page 2
    act(() => {
      result.current.fetchNextPage();
    });

    expect(mockUseGetAssetsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));

    // Change sort
    sort = 'name:ASC';
    rerender();

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
      isLoading: false,
      isFetching: false,
      error: mockError,
    });

    const { result } = renderHook(() => useInfiniteAssets());

    expect(result.current.error).toBe(mockError);
  });
});
