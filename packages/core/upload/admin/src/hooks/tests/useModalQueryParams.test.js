import { act, renderHook, waitFor } from '@tests/utils';

import useModalQueryParams from '../useModalQueryParams';

const FIXTURE_QUERY = {
  page: 1,
  sort: 'updatedAt:DESC',
  pageSize: 10,
  filters: {
    $and: [],
  },
};

describe('useModalQueryParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setup proper defaults', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    expect(result.current[0].queryObject).toStrictEqual(FIXTURE_QUERY);
    expect(result.current[0].rawQuery).toMatchInlineSnapshot(
      `"page=1&sort=updatedAt:DESC&pageSize=10"`
    );

    expect(result.current[1]).toStrictEqual({
      onChangeFilters: expect.any(Function),
      onChangeFolder: expect.any(Function),
      onChangePage: expect.any(Function),
      onChangePageSize: expect.any(Function),
      onChangeSort: expect.any(Function),
      onChangeSearch: expect.any(Function),
    });

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));
  });

  test('handles initial state', async () => {
    const { result } = renderHook(() => useModalQueryParams({ state: true }));

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      state: true,
    });

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));
  });

  test('onChangeFilters', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangeFilters([{ some: 'thing' }]);
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
      filters: {
        ...FIXTURE_QUERY.filters,
        $and: [
          {
            some: 'thing',
          },
        ],
      },
    });
  });

  test('onChangeFolder', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangeFolder({ id: 1 }, '/1');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
      folder: {
        id: 1,
      },
      folderPath: '/1',
    });
  });

  test('onChangePage', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangePage({ id: 1 });
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
      page: {
        id: 1,
      },
    });
  });

  test('onChangePageSize', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangePageSize(5);
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangePageSize - converts string to numbers', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangePageSize('5');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangeSort', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangeSort('something:else');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
      sort: 'something:else',
    });
  });

  test('onChangeSearch', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangeSearch('something');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
      _q: 'something',
    });
  });

  test('onChangeSearch - empty string resets all values and removes _q and page', async () => {
    const { result } = renderHook(() => useModalQueryParams());

    await waitFor(() => expect(result.current[0].queryObject.pageSize).toBe(20));

    act(() => {
      result.current[1].onChangePage({ id: 1 });
    });

    act(() => {
      result.current[1].onChangeSearch('something');
    });

    act(() => {
      result.current[1].onChangeSearch('');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 20,
    });
  });
});
