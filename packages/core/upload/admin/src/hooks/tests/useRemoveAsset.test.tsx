/* eslint-disable check-file/filename-naming-convention */
import { NotificationsProvider, useNotification } from '@strapi/admin/strapi-admin';
import { DesignSystemProvider } from '@strapi/design-system';
import { act, renderHook, waitFor } from '@testing-library/react';
import { server } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider, useQueryClient } from 'react-query';

import { useRemoveAsset } from '../useRemoveAsset';

const ASSET_FIXTURE = {
  id: 1,
};

const notificationStatusMock = jest.fn();

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification() {
    return { toggleNotification: notificationStatusMock };
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

const ComponentFixture = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={client}>
      <DesignSystemProvider>
        <NotificationsProvider>
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        </NotificationsProvider>
      </DesignSystemProvider>
    </QueryClientProvider>
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
      http.delete('/upload/:type/:id', () => {
        return new HttpResponse(null, { status: 500 });
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
