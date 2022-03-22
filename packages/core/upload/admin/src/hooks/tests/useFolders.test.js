/* eslint-disable import/no-duplicates */
/* eslint-disable import/order */
/* eslint-disable import/first */

import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { NotificationsProvider } from '@strapi/helper-plugin';

import { useFolders } from '../useFolders';

const notifyStatusMock = jest.fn();

jest.mock('@strapi/design-system/LiveRegions', () => ({
  ...jest.requireActual('@strapi/design-system/LiveRegions'),
  useNotifyAT: () => ({
    notifyStatus: notifyStatusMock,
  }),
}));

import { useNotifyAT } from '@strapi/design-system/LiveRegions';

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

import { axiosInstance } from '../../utils';

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
}));

import { useNotification } from '@strapi/helper-plugin';

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
  return new Promise(resolve => {
    act(() => {
      resolve(renderHook(() => useFolders(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolders', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL', async () => {
    const { result, waitFor } = await setup({});

    await waitFor(() => result.current.isSuccess);

    expect(axiosInstance.get).toBeCalledWith('/upload/folders');
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { result, waitFor } = await setup({ enabled: false });

    await waitFor(() => result.current.isSuccess);

    expect(axiosInstance.get).toBeCalledTimes(0);
  });

  test('calls notifyStatus in case of success', async () => {
    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { waitForNextUpdate } = await setup({});

    await waitForNextUpdate();

    expect(notifyStatus).toBeCalledWith('The folders have finished loading.');
    expect(toggleNotification).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { waitFor } = await setup({});

    await waitFor(() => expect(toggleNotification).toBeCalled());
    await waitFor(() => expect(notifyStatus).not.toBeCalled());
  });
});
