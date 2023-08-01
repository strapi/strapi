import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useAdminRoles } from '..';

const server = setupServer(
  rest.get('*/roles', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 1,
            code: 'strapi-editor',
          },

          {
            id: 2,
            code: 'strapi-author',
          },
        ],
      })
    )
  ),

  rest.get('*/roles/1', (req, res, ctx) =>
    res(
      ctx.json({
        data: {
          id: 1,
          code: 'strapi-editor',
          params: {
            some: req.url.searchParams.get('some'),
          },
        },
      })
    )
  )
);

const setup = (...args) =>
  renderHook(() => useAdminRoles(...args), {
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

describe('useAdminRoles', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches roles', async () => {
    const { result } = setup();

    expect(result.current.isLoading).toBe(true);

    expect(result.current.roles).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );
  });

  test('fetches a single role', async () => {
    const { result } = setup({ id: 1 });

    expect(result.current.isLoading).toBe(true);

    expect(result.current.roles).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual([
      expect.objectContaining({
        id: 1,
      }),
    ]);
  });

  test('forwards all query params except `id`', async () => {
    const { result } = setup({ id: 1, some: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roles).toStrictEqual([
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
