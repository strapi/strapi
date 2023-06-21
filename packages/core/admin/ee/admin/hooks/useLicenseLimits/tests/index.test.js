import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { useRBAC } from '@strapi/helper-plugin';
import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import useLicenseLimits from '..';

const server = setupServer(
  ...[
    rest.get('*/license-limit-information', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            attribute: 1,
          },
        })
      );
    }),
  ]
);

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn(() => ({
    isLoading: false,
    allowedActions: {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    },
  })),
}));

const setup = (...args) =>
  renderHook(() => useLicenseLimits(...args), {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      });

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </Provider>
      );
    },
  });

describe('useLicenseLimits', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  it('should fetch the license limit information', async () => {
    const { result } = setup();

    expect(result.current.license).toEqual({});

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.license).toEqual({
      attribute: 1,
    });
  });

  it.each(['canRead', 'canCreate', 'canUpdate', 'canDelete'])(
    'should not fetch the license limit information, when the user does not have the %s permissions',
    async (permission) => {
      const allowedActions = {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      };

      allowedActions[permission] = false;

      useRBAC.mockReturnValue({
        isLoading: false,
        allowedActions,
      });

      const { result } = setup();

      await waitFor(() => expect(result.current.isLoading).toBeFalsy());

      expect(result.current.license).toEqual({});
    }
  );
});
