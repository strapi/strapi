import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useAdminRolePermissionLayout } from '..';

const server = setupServer(
  rest.get('*/permissions', (req, res, ctx) => {
    const role = req.url.searchParams.get('role');

    if (role !== '1') {
      return res(ctx.status(404));
    }

    return res(
      ctx.json({
        data: {
          conditions: [
            {
              id: 'admin::is-creator',
              displayName: 'Is creator',
              category: 'default',
            },
          ],
          sections: {
            settings: [
              {
                displayName: 'Access the Email Settings page',
                category: 'email',
                subCategory: 'general',
                action: 'plugin::email.settings.read',
              },
            ],
          },
        },
      })
    );
  })
);

const setup = (...args) =>
  renderHook(() => useAdminRolePermissionLayout(...args), {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  });

describe('useAdminRolePermissionLayout', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches permissions layout', async () => {
    const { result } = setup(1);

    expect(result.current.isLoading).toBe(true);

    expect(result.current.data).toStrictEqual(undefined);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toStrictEqual(
      expect.objectContaining({
        conditions: expect.any(Array),
      })
    );
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(1, {
      enabled: false,
    });

    expect(result.current.isLoading).toBe(false);
  });
});
