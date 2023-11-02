/* eslint-disable check-file/filename-naming-convention */

import { configureStore } from '@reduxjs/toolkit';
import { fixtures } from '@strapi/admin-test-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { UseLicenseLimitsArgs, useLicenseLimits } from '../useLicenseLimits';

const server = setupServer(
  ...[
    rest.get('*/license-limit-information', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            attribute: 1,

            features: [{ name: 'sso' }, { name: 'audit-logs', options: { retentionDays: 1 } }],
          },
        })
      );
    }),
  ]
);

const setup = (args?: UseLicenseLimitsArgs) =>
  renderHook(() => useLicenseLimits(args), {
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
          store={configureStore({
            reducer: (state) => state,
            preloadedState: {
              admin_app: { permissions: fixtures.permissions.app },
            },
          })}
        >
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </Provider>
      );
    },
  });

describe('useLicenseLimits', () => {
  beforeAll(() => server.listen());

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the license limit information', async () => {
    const { result } = setup();

    expect(result.current.license).toEqual({});

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.license).toEqual(
      expect.objectContaining({
        attribute: 1,
        features: expect.any(Array),
      })
    );
  });

  it('exposes a getFeature() method as a shortcut to feature options', async () => {
    const { result } = setup();

    expect(result.current.getFeature('sso')).toStrictEqual({});
    expect(result.current.getFeature('audit-logs')).toStrictEqual({});

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.getFeature('sso')).toStrictEqual({});
    expect(result.current.getFeature('audit-logs')).toStrictEqual({ something: true });
  });

  it('does return an empty object of enabled == false', async () => {
    const { result } = setup({ enabled: false });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.license).toStrictEqual({});
  });
});
