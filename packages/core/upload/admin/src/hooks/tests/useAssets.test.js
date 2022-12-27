import React from 'react';
import { stringify } from 'qs';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';

import { axiosInstance } from '../../utils';
import { useAssets } from '../useAssets';

const notifyStatusMock = jest.fn();

jest.mock('@strapi/design-system/LiveRegions', () => ({
  ...jest.requireActual('@strapi/design-system/LiveRegions'),
  useNotifyAT: () => ({
    notifyStatus: notifyStatusMock,
  }),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  axiosInstance: {
    get: jest.fn().mockResolvedValue({
      data: {
        id: 1,
      },
    }),
  },
}));

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
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
          <NotificationsProvider toggleNotification={() => jest.fn()}>
            <IntlProvider locale="en" messages={{}}>
              {children}
            </IntlProvider>
          </NotificationsProvider>
        </QueryClientProvider>
      </Route>
    </Router>
  );
}

function setup(...args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useAssets(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query was set', async () => {
    const { result, waitFor, waitForNextUpdate } = await setup();

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            folder: {
              id: {
                $null: true,
              },
            },
          },
        ],
      },
    };

    expect(axiosInstance.get).toBeCalledWith(
      `/upload/files${stringify(expected, { encode: false, addQueryPrefix: true })}`
    );
  });

  test('fetches data from the right URL if a query was set', async () => {
    const { result, waitFor, waitForNextUpdate } = await setup({ query: { folder: 1 } });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            folder: {
              id: 1,
            },
          },
        ],
      },
    };

    expect(axiosInstance.get).toBeCalledWith(
      `/upload/files${stringify(expected, { encode: false, addQueryPrefix: true })}`
    );
  });

  test('allows to merge filter query params using filters.$and', async () => {
    const { result, waitFor, waitForNextUpdate } = await setup({
      query: { folder: 5, filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            something: true,
          },
          {
            folder: {
              id: 5,
            },
          },
        ],
      },
    };

    expect(axiosInstance.get).toBeCalledWith(
      `/upload/files${stringify(expected, { encode: false, addQueryPrefix: true })}`
    );
  });

  test('does not use folder filter in params if _q', async () => {
    const { result, waitFor, waitForNextUpdate } = await setup({
      query: { folder: 5, _q: 'something', filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            something: true,
          },
        ],
      },
      _q: 'something',
    };

    expect(axiosInstance.get).toBeCalledWith(
      `/upload/files${stringify(expected, { encode: false, addQueryPrefix: true })}`
    );
  });

  test('correctly encodes the search query _q', async () => {
    const _q = 'something&else';
    const { result, waitFor, waitForNextUpdate } = await setup({
      query: { folder: 5, _q, filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            something: true,
          },
        ],
      },
      _q: encodeURIComponent(_q),
    };

    expect(axiosInstance.get).toBeCalledWith(
      `/upload/files${stringify(expected, { encode: false, addQueryPrefix: true })}`
    );
  });

  test('it does not fetch, if skipWhen is set', async () => {
    const { result, waitFor } = await setup({ skipWhen: true });

    await waitFor(() => result.current.isSuccess);

    expect(axiosInstance.get).toBeCalledTimes(0);
  });

  test('calls notifyStatus in case of success', async () => {
    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { result, waitFor, waitForNextUpdate } = await setup({});

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    expect(notifyStatus).toBeCalledWith('The assets have finished loading.');
    expect(toggleNotification).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    axiosInstance.get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { result, waitFor, waitForNextUpdate } = await setup({});

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    expect(toggleNotification).toBeCalled();
    expect(notifyStatus).not.toBeCalled();

    console.error = originalConsoleError;
  });
});
