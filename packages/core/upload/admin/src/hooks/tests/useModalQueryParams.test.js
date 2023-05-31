import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import useModalQueryParams from '../useModalQueryParams';

const refetchQueriesMock = jest.fn();

jest.mock('react-query', () => ({
  ...jest.requireActual('react-query'),
  useQueryClient: () => ({
    refetchQueries: refetchQueriesMock,
  }),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// eslint-disable-next-line react/prop-types
function ComponentFixture({ children }) {
  return (
    <Router>
      <Route>
        <QueryClientProvider client={client}>
          <ThemeProvider theme={lightTheme}>
            <NotificationsProvider>
              <IntlProvider locale="en" messages={{}}>
                {children}
              </IntlProvider>
            </NotificationsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </Route>
    </Router>
  );
}

function setup(...args) {
  return renderHook(() => useModalQueryParams(...args), { wrapper: ComponentFixture });
}

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
    const {
      result: {
        current: [{ queryObject, rawQuery }, callbacks],
      },
    } = await setup();

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

  test('set initial state', async () => {
    const {
      result: { current },
    } = await setup();

    expect(current[0].queryObject).toStrictEqual(FIXTURE_QUERY);
  });

  test('handles initial state', async () => {
    const {
      result: { current },
    } = await setup({ state: true });

    expect(current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      state: true,
    });
  });

  test('onChangeFilters', async () => {
    const { result } = await setup();

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

  test('onChangeFolder', async () => {
    const { result } = await setup();

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

  test('onChangePage', async () => {
    const { result } = await setup();

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

  test('onChangePageSize', async () => {
    const { result } = await setup();

    act(() => {
      result.current[1].onChangePageSize(5);
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangePageSize - converts string to numbers', async () => {
    const { result } = await setup();

    act(() => {
      result.current[1].onChangePageSize('5');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      pageSize: 5,
    });
  });

  test('onChangeSort', async () => {
    const { result } = await setup();

    act(() => {
      result.current[1].onChangeSort('something:else');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      sort: 'something:else',
    });
  });

  test('onChangeSearch', async () => {
    const { result } = await setup();

    act(() => {
      result.current[1].onChangeSearch('something');
    });

    expect(result.current[0].queryObject).toStrictEqual({
      ...FIXTURE_QUERY,
      _q: 'something',
    });
  });

  test('onChangeSearch - empty string resets all values and removes _q and page', async () => {
    const { result } = await setup();

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
