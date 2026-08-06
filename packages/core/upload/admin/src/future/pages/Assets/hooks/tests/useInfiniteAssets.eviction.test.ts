import { renderHook } from '@testing-library/react';

import { uploadApi } from '../../../../services/api';
import { useInfiniteAssets } from '../useInfiniteAssets';

/**
 * A leaving-the-folder regression guard: RTK Query 1.9.7 can leave a query's
 * store subscription in place when its last subscriber unmounts mid-refetch, so
 * `useInfiniteAssets` evicts the left folder's `getAssets` cache entries on a
 * folder change. Without it a later `{Asset, LIST}` invalidation refetches the
 * previous folder's pages (one bogus `/upload/files` request per loaded page).
 */

const emptyPage = {
  results: [],
  pagination: { page: 1, pageSize: 20, pageCount: 1, total: 0 },
};
const queryResult = {
  data: emptyPage,
  currentData: emptyPage,
  isLoading: false,
  isFetching: false,
  error: undefined,
};

const mockUseGetAssetsQuery = jest.fn(() => queryResult);
jest.mock('../../../../services/assets', () => ({
  // The hook's query args are irrelevant here — the eviction path only reads the
  // store and dispatches — so the mock returns a fixed result regardless.
  useGetAssetsQuery: () => mockUseGetAssetsQuery(),
}));

const mockDispatch = jest.fn();
let mockState: unknown = {};
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
  useStore: () => ({ getState: () => mockState }),
}));

const key = (folder: number, page: number) =>
  `getAssets({"filters":[],"folder":${folder},"page":${page},"pageSize":20,"sort":"updatedAt:DESC"})`;

const evictedKeys = () =>
  mockDispatch.mock.calls
    .map(([action]) => (action as { payload?: { queryCacheKey?: string } })?.payload?.queryCacheKey)
    .filter((k): k is string => Boolean(k));

describe('useInfiniteAssets — cache eviction on folder change', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      [uploadApi.reducerPath]: {
        queries: {
          [key(1, 1)]: {},
          [key(1, 2)]: {},
          [key(2, 1)]: {},
          'getFolders({"parentId":1})': {},
        },
      },
    };
  });

  it('evicts only the previous folder getAssets entries when the folder changes', () => {
    const { rerender } = renderHook(({ folder }) => useInfiniteAssets({ folder }), {
      initialProps: { folder: 1 as number | null },
    });

    mockDispatch.mockClear(); // ignore the initial mount

    rerender({ folder: 2 });

    const evicted = evictedKeys();
    expect(evicted).toEqual(expect.arrayContaining([key(1, 1), key(1, 2)]));
    // Never the folder we navigated into, never non-asset queries.
    expect(evicted).not.toContain(key(2, 1));
    expect(evicted).not.toContain('getFolders({"parentId":1})');
  });

  it('does not evict anything when the folder is unchanged', () => {
    const { rerender } = renderHook(({ folder }) => useInfiniteAssets({ folder }), {
      initialProps: { folder: 1 as number | null },
    });

    mockDispatch.mockClear();
    rerender({ folder: 1 });

    expect(evictedKeys()).toHaveLength(0);
  });
});
