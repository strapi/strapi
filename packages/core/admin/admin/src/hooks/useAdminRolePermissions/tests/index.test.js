import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useAdminRolePermissions } from '..';

const server = setupServer(
  rest.get('*/roles/1/permissions', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 1,
            action: 'plugin::content-manager.explorer.create',
            subject: 'api::address.address',
            properties: {
              fields: ['postal_code', 'categories'],
            },
            conditions: [],

            params: {
              some: req.url.searchParams.get('some'),
            },
          },
        ],
      })
    )
  )
);

const setup = (...args) =>
  renderHook(() => useAdminRolePermissions(...args), {
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

describe('useAdminRolePermissions', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches permissions', async () => {
    const { result } = setup({ id: 1 });

    expect(result.current.isLoading).toBe(true);

    expect(result.current.permissions).toStrictEqual(undefined);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );
  });

  test('forwards all query params except `id`', async () => {
    const { result } = setup({ id: 1, some: 'param' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.permissions).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          params: {
            some: 'param',
          },
        }),
      ])
    );
  });

  test('extends the default react-query options', async () => {
    const { result } = setup(
      { id: 1 },
      {
        enabled: false,
      }
    );

    expect(result.current.isLoading).toBe(false);
  });

  test('throw an error, if id is not passed', async () => {
    jest.spyOn(console, 'error');

    console.error.mockImplementation(() => {});

    await expect(() => {
      setup(
        {},
        {
          enabled: true,
        }
      );
    }).toThrow();

    await expect(() => {
      setup();
    }).toThrow();

    await expect(() => {
      setup(
        {},
        {
          enabled: true,
        }
      );
    }).toThrow();

    console.error.mockRestore();
  });
});
