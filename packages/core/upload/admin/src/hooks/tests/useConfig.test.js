import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider, useQueryClient } from 'react-query';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { pageSizes, sortOptions } from '../../constants';
import pluginId from '../../pluginId';
import { useConfig } from '../useConfig';

const mockGetResponse = {
  data: {
    data: {
      pageSize: pageSizes[0],
      sort: sortOptions[0].value,
    },
  },
};

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
  useFetchClient: jest.fn().mockReturnValue({
    put: jest.fn().mockResolvedValue({ data: { data: {} } }),
    get: jest.fn(),
  }),
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
      const { get } = useFetchClient();
      get.mockReturnValueOnce(mockGetResponse);

      const { result } = await setup();
      expect(get).toHaveBeenCalledWith(`/${pluginId}/configuration`);

      await waitFor(() => expect(result.current.config.isLoading).toBe(false));
      expect(result.current.config.data).toEqual(mockGetResponse.data.data);
    });

    test('should still return an object even if the server returns a falsey value', async () => {
      const { get } = useFetchClient();
      get.mockReturnValueOnce({
        data: {
          data: null,
        },
      });

      const { result } = await setup();

      await waitFor(() => expect(result.current.config.data).toEqual({}));
    });

    test('calls toggleNotification in case of error', async () => {
      const { get } = useFetchClient();
      const originalConsoleError = console.error;
      console.error = jest.fn();

      get.mockRejectedValueOnce(new Error('Jest mock error'));
      const toggleNotification = useNotification();
      await setup({});

      await waitFor(() =>
        expect(toggleNotification).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        })
      );

      console.error = originalConsoleError;
    });
  });

  describe('mutation', () => {
    test('does call the proper mutation endpoint', async () => {
      const { put } = useFetchClient();
      const queryClient = useQueryClient();

      let setupResult;
      await act(async () => {
        setupResult = await setup();
      });

      const {
        result: {
          current: { mutateConfig },
        },
      } = setupResult;

      const mutateWith = {};
      await act(async () => {
        await mutateConfig.mutateAsync(mutateWith);
      });

      expect(put).toHaveBeenCalledWith(`/${pluginId}/configuration`, mutateWith);
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'configuration'], {
        active: true,
      });
    });

    test('does handle errors', async () => {
      const { put } = useFetchClient();
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const toggleNotification = useNotification();
      put.mockRejectedValueOnce(new Error('Jest mock error'));

      const {
        result: { current },
      } = await setup();
      const { mutateConfig } = current;

      const mutateWith = {};
      try {
        await act(async () => {
          await mutateConfig.mutateAsync(mutateWith);
        });
      } catch {
        expect(toggleNotification).toBeCalledWith({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }

      console.error = originalConsoleError;
    });
  });
});
