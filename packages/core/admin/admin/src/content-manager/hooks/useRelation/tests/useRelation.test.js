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

function setup(...args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useRelation(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useRelation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetch relations', async () => {
    const { result, waitForNextUpdate } = await setup({ name: 'test' });

    await waitForNextUpdate();

    expect(result.current.relations.isSuccess).toBe(true);
    expect(axiosInstance.get).toBeCalledTimes(1);
    expect(axiosInstance.get).toBeCalledWith('?page=1');
  });

  test('fetch relations next page, if a full page was returned', async () => {
    axiosInstance.get = jest.fn().mockResolvedValue({
      data: [1, 2],
    });

    const { result, waitForNextUpdate } = await setup({ name: 'test', relationsToShow: 1 });

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(2);
    expect(axiosInstance.get).toHaveBeenNthCalledWith(1, '?page=1');
    expect(axiosInstance.get).toHaveBeenNthCalledWith(2, '?page=2');
  });

  test('does not fetch relations next page, if a full page was not returned', async () => {
    axiosInstance.get = jest.fn().mockResolvedValue({
      data: [1, 2],
    });

    const { result, waitForNextUpdate } = await setup({ name: 'test', relationsToShow: 3 });

    await waitForNextUpdate();

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitForNextUpdate();

    expect(axiosInstance.get).toBeCalledTimes(1);
  });

  test('does not fetch search by default', async () => {
    const { result, waitForNextUpdate } = await setup({ name: 'test' });

    await waitForNextUpdate();

    expect(result.current.search.isLoading).toBe(false);
  });

  test('does fetch search results once a term was provided', async () => {
    const { result, waitForNextUpdate } = await setup({ name: 'test' });

    await waitForNextUpdate();

    const spy = jest.fn().mockResolvedValue({ data: [] });
    axiosInstance.get = spy;

    act(() => {
      result.current.searchFor('something');
    });

    await waitForNextUpdate();

    expect(spy).toBeCalledTimes(1);
    expect(spy).toBeCalledWith('?page=1');
  });

  test('fetch search next page, if a full page was returned', async () => {
    const { result, waitForNextUpdate } = await setup({ name: 'test', searchResultsToShow: 1 });

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
    expect(spy).toHaveBeenNthCalledWith(1, '?page=1');
    expect(spy).toHaveBeenNthCalledWith(2, '?page=2');
  });

  test('doesn not fetch search next page, if a full page was not returned', async () => {
    const { result, waitForNextUpdate } = await setup({ name: 'test', searchResultsToShow: 3 });

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
