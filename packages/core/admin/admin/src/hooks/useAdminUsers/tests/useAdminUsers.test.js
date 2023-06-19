import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useAdminUsers } from '../useAdminUsers';

const server = setupServer(
  rest.get('*/users', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          results: [
            {
              id: 1,
            },
          ],

          pagination: {
            page: 1,
          },
        },
      })
    )
  ),

  rest.get('*/users/1', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          id: 1,
          params: {
            some: req.url.searchParams.get('some'),
          },
        },
      })
    )
  )
);

const setup = (...args) =>
  renderHook(() => useAdminUsers(...args), {
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

describe('useAdminUsers', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches users', async () => {
    const { result } = setup();

    expect(result.current.isLoading).toBe(true);

    expect(result.current.users).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.pagination).toStrictEqual(
      expect.objectContaining({
        page: 1,
      })
    );
  });

  test('fetches a single user', async () => {
    const { result } = setup({ id: 1 });

    expect(result.current.isLoading).toBe(true);

    expect(result.current.users).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual([
      expect.objectContaining({
        id: 1,
      }),
    ]);
  });

  test('forwards all query params except `id`', async () => {
    const { result } = setup({ id: 1, some: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.users).toStrictEqual([
      expect.objectContaining({
        params: {
          some: 'param',
        },
      }),
    ]);
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(
      { id: null },
      {
        enabled: false,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });
});
