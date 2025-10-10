/* eslint-disable check-file/filename-naming-convention */
import { configureStore } from '@reduxjs/toolkit';
import { adminApi, NotificationsProvider, useNotification } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { server } from '@tests/utils';
import { rest } from 'msw';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider, useQueryClient } from 'react-query';
import { Provider } from 'react-redux';

import { useRemoveAsset } from '../useRemoveAsset';

import type { AnyAction } from '@reduxjs/toolkit';
import type { Middleware } from 'redux';

const ASSET_FIXTURE = {
  id: 1,
};

const notificationStatusMock = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification() {
    return { toggleNotification: notificationStatusMock };
  },
  adminApi: {
    reducerPath: 'adminApi',
    reducer: (state = {}, action: AnyAction) => state,
    middleware: (() => (next) => (action) => next(action)) as Middleware,
    util: {
      invalidateTags: jest.fn((tags) => ({
        type: 'adminApi/util/invalidateTags',
        payload: tags,
      })),
    },
  },
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

const store = configureStore({
  reducer: { [adminApi.reducerPath]: adminApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(adminApi.middleware),
});

const ComponentFixture = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <DesignSystemProvider>
          <NotificationsProvider>
            <IntlProvider locale="en" messages={{}}>
              {children}
            </IntlProvider>
          </NotificationsProvider>
        </DesignSystemProvider>
      </QueryClientProvider>
    </Provider>
  );
};

function setup(...args: Parameters<typeof useRemoveAsset>) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useRemoveAsset(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useRemoveAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls toggleNotification in case of an success', async () => {
    const { toggleNotification } = useNotification();
    const {
      result: { current },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = (await setup(jest.fn)) as { result: { current: any } };
    const { removeAsset } = current;

    try {
      await act(async () => {
        await removeAsset(ASSET_FIXTURE);
      });
    } catch (err) {
      // ...
    }

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
    );
  });

  test('does call refetchQueries in case of success', async () => {
    const queryClient = useQueryClient();
    const {
      result: { current },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = (await setup(jest.fn)) as { result: { current: any } };
    const { removeAsset } = current;

    await act(async () => {
      await removeAsset(ASSET_FIXTURE);
    });

    await waitFor(() =>
      expect(queryClient.refetchQueries).toHaveBeenCalledWith(['upload', 'assets'], {
        active: true,
      })
    );
  });

  test('calls toggleNotification in case of an error', async () => {
    server.use(
      rest.delete('/upload/:type/:id', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const { toggleNotification } = useNotification();
    const {
      result: { current },
      // @ts-expect-error We are checking the error case
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = (await setup()) as { result: { current: any } };
    const { removeAsset } = current;

    try {
      await act(async () => {
        await removeAsset(ASSET_FIXTURE);
      });
    } catch (err) {
      // ...
    }

    await waitFor(() =>
      expect(toggleNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'danger', message: 'Unexpected end of JSON input' })
      )
    );

    console.error = originalConsoleError;
  });
});
