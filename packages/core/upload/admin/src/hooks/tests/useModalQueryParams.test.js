import { renderHook, act } from '@testing-library/react-hooks';

import useModalQueryParams from '../useModalQueryParams';

const FIXTURE_QUERY = {
  page: 1,
  sort: 'updatedAt:DESC',
  pageSize: 10,
  filters: {
    $and: [],
  },
};

function setup(...args) {
  return renderHook(() => useModalQueryParams(...args));
}

describe('useModalQueryParams', () => {
  test('setup proper defaults', () => {
    const {
      result: {
        current: [{ queryObject, rawQuery }, callbacks],
      },
    } = setup();

    expect(queryObject).toStrictEqual(FIXTURE_QUERY);
    expect(rawQuery).toBe('page=1&sort=updatedAt:DESC&pageSize=10');

    expect(callbacks).toStrictEqual({
      onChangeFilters: expect.any(Function),
      onChangeFolder: expect.any(Function),
      onChangePage: expect.any(Function),
      onChangePageSize: expect.any(Function),
      onChangeSort: expect.any(Function),
      onChangeSearch: expect.any(Function),
    });
  });

  test('set initial state', () => {
    const {
      result: { current },
    } = setup();

    expect(current[0].queryObject).toStrictEqual(FIXTURE_QUERY);
  });

  test('handles initial state', () => {
    const {
      result: { current },
    } = setup({ state: true });

    expect(current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      state: true,
    });
  });

  test('onChangeFilters', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangeFilters([{ some: 'thing' }]);
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
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

  test('onChangeFolder', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangeFolder({ id: 1 });
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      folder: {
        id: 1,
      },
    });
  });

  test('onChangePage', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangePage({ id: 1 });
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      page: {
        id: 1,
      },
    });
  });

  test('onChangePageSize', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangePageSize(5);
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangePageSize - converts string to numbers', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangePageSize('5');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangeSort', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangeSort('something:else');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      sort: 'something:else',
    });
  });

  test('onChangeSearch', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangeSearch('something');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      _q: 'something',
    });
  });

  test('onChangeSearch - empty string resets all values and removes _q and page', () => {
    const { result } = setup();

    act(() => {
      result.current[1].onChangePage({ id: 1 });
    });

    act(() => {
      result.current[1].onChangeSearch('something');
    });

    act(() => {
      result.current[1].onChangeSearch('');
    });

    expect(result.current[0].queryObject).toStrictEqual(FIXTURE_QUERY);
  });
});
