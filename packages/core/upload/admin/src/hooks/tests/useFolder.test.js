import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification, useFetchClient } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system';

import { useFolder } from '../useFolder';

const notifyStatusMock = jest.fn();

jest.mock('@strapi/design-system', () => ({
  ...jest.requireActual('@strapi/design-system'),
  useNotifyAT: () => ({
    notifyStatus: notifyStatusMock,
  }),
}));

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        id: 1,
      },
    }),
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
      resolve(renderHook(() => useFolder(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolder', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query param was set', async () => {
    const { get } = useFetchClient();
    const { result, waitFor, waitForNextUpdate } = await setup(1, {});

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    expect(get).toBeCalledWith('/upload/folders/1?populate[parent][populate][parent]=*');
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { get } = useFetchClient();
    const { result, waitFor } = await setup(1, { enabled: false });

    await waitFor(() => result.current.isSuccess);

    expect(get).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const { get } = useFetchClient();
    const originalConsoleError = console.error;
    console.error = jest.fn();

    get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { result, waitFor } = await setup(1, {});

    await waitFor(() => !result.current.isLoading);

    expect(toggleNotification).toBeCalled();
    expect(notifyStatus).not.toBeCalled();

    console.error = originalConsoleError;
  });
});
