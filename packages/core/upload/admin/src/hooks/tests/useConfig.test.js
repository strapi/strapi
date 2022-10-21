import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient, useQueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification } from '@strapi/helper-plugin';

import { sortOptions, pageSizes } from '../../constants';
import { axiosInstance } from '../../utils';
import { useConfig } from '../useConfig';
import pluginId from '../../pluginId';

const getResponse = {
  data: {
    data: {
      pageSize: pageSizes[0],
      sort: sortOptions[0].value,
    },
  },
};

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  axiosInstance: {
    put: jest.fn(() => {
      const res = { data: { data: {} } };

      return Promise.resolve(res);
    }),
    get: jest.fn(() => getResponse),
  },
}));

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

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
      resolve(renderHook(() => useConfig(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query', () => {
    test('does call the get endpoint', async () => {
      const { waitFor, result } = await setup();
      expect(axiosInstance.get).toHaveBeenCalledWith(`/${pluginId}/configuration`);

      await waitFor(() => !result.current.config.isLoading);
      expect(result.current.config.data).toEqual(getResponse.data.data);
    });

    test('calls toggleNotification in case of error', async () => {
      console.error = jest.fn();
      axiosInstance.get.mockRejectedValueOnce(new Error('Jest mock error'));
      const toggleNotification = useNotification();
      const { waitFor } = await setup({});

      await waitFor(() =>
        expect(toggleNotification).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );
    });
  });

  describe('mutation', () => {
    test('does call the proper mutation endpoint', async () => {
      const queryClient = useQueryClient();

      const {
        result: { current },
      } = await setup();
      const { mutateConfig } = current;

      const mutateWith = {};
      await act(async () => {
        await mutateConfig.mutateAsync(mutateWith);
      });

      expect(axiosInstance.put).toHaveBeenCalledWith(`/${pluginId}/configuration`, mutateWith);
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'configuration'], {
        active: true,
      });
    });

    test('does handle errors', async () => {
      console.error = jest.fn();
      const toggleNotification = useNotification();
      axiosInstance.put.mockRejectedValueOnce(new Error('Jest mock error'));

      const {
        result: { current },
      } = await setup();
      const { mutateConfig } = current;

      const mutateWith = {};
      await act(async () => {
        try {
          await mutateConfig.mutateAsync(mutateWith);
        } catch {
          expect(toggleNotification).toBeCalledWith({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      });
    });
  });
});
