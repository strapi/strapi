import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';

import { axiosInstance } from '../../../../core/utils';
import { useRelation } from '../useRelation';

jest.mock('../../../../core/utils', () => ({
  ...jest.requireActual('../../../../core/utils'),
  axiosInstance: {
    get: jest.fn().mockResolvedValue({ data: [] }),
  },
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// eslint-disable-next-line react/prop-types
const ComponentFixture = ({ children }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

function setup(name = 'test', opts) {
  const options = {
    ...opts,
    endpoints: {
      relation: '/',
      search: '/',
      ...opts?.endpoints,
    },
  };

  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useRelation(name, options), { wrapper: ComponentFixture }));
    });
  });
}

describe('useRelation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetch relations', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(result.current.relations.isSuccess).toBe(true);
    expect(axiosInstance.get).toBeCalledTimes(1);
    expect(axiosInstance.get).toBeCalledWith('/', {
      limit: 10,
      page: 1,
    });
  });

  test('fetch relations with different limit', async () => {
    const { waitForNextUpdate } = await setup(undefined, { relationsToShow: 5 });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledWith(expect.any(String), {
      limit: 5,
      page: expect.any(Number),
    });
  });

  test('doesn not fetch relations if a relation endpoint was not passed', async () => {
    await setup(undefined, { endpoints: { relation: undefined } });

    expect(axiosInstance.get).not.toBeCalled();
  });

  test('fetch relations', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(result.current.relations.isSuccess).toBe(true);
    expect(axiosInstance.get).toBeCalledTimes(1);
    expect(axiosInstance.get).toBeCalledWith('/', {
      limit: 10,
      page: 1,
    });
  });

  test('fetch relations next page, if a full page was returned', async () => {
    axiosInstance.get = jest.fn().mockResolvedValue({
      data: [1, 2],
    });

    const { result, waitForNextUpdate } = await setup(undefined, { relationsToShow: 1 });

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(2);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '/', {
      limit: expect.any(Number),
      page: 1,
    });
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '/', {
      limit: expect.any(Number),
      page: 2,
    });
  });

  test('does not fetch relations next page, if a full page was not returned', async () => {
    axiosInstance.get = jest.fn().mockResolvedValue({
      data: [1, 2],
    });

    const { result, waitForNextUpdate } = await setup(undefined, { relationsToShow: 3 });

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(1);
  });

  test('does not fetch search by default', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    expect(result.current.search.isLoading).toBe(false);
  });

  test('does fetch search results once a term was provided', async () => {
    const { result, waitForNextUpdate } = await setup();

    await waitForNextUpdate();

    const spy = jest.fn().mockResolvedValue({ data: [] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith('/', { limit: 10, page: 1 });
  });

  test('does fetch search results with a different limit', async () => {
    const { result, waitForNextUpdate } = await setup(undefined, { searchResultsToShow: 5 });

    await waitForNextUpdate();

    const spy = jest.fn().mockResolvedValue({ data: [] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith(expect.any(String), { limit: 5, page: expect.any(Number) });
  });

  test('does not fetch search results once a term was provided, but no endpoint was set', async () => {
    const { result, waitForNextUpdate } = await setup(undefined, {
      endpoints: { search: undefined },
    });

    const spy = jest.fn().mockResolvedValue({ data: [] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).not.toBeCalled();
  });

  test('fetch search next page, if a full page was returned', async () => {
    const { result, waitForNextUpdate } = await setup(undefined, { searchResultsToShow: 1 });

    const spy = jest.fn().mockResolvedValue({ data: [1, 2] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    act(() => {
      result.current.search.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, '/', { limit: expect.any(Number), page: 1 });
    expect(spy).toHaveBeenNthCalledWith(2, '/', { limit: expect.any(Number), page: 2 });
  });

  test('doesn not fetch search next page, if a full page was not returned', async () => {
    const { result, waitForNextUpdate } = await setup(undefined, { searchResultsToShow: 3 });

    const spy = jest.fn().mockResolvedValue({ data: [1, 2] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    act(() => {
      result.current.search.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
  });
});
