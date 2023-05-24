import * as React from 'react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { renderHook } from '@testing-library/react-hooks';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useContentTypes } from '../useContentTypes';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockReturnValue(jest.fn),
}));

const server = setupServer(
  rest.get('*/content-manager/content-types', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            uid: 'admin::collectionType',
            isDisplayed: true,
            apiID: 'permission',
            kind: 'collectionType',
          },

          {
            uid: 'admin::collectionTypeNotDispalyed',
            isDisplayed: false,
            apiID: 'permission',
            kind: 'collectionType',
          },

          {
            uid: 'admin::singleType',
            isDisplayed: true,
            kind: 'singleType',
          },

          {
            uid: 'admin::singleTypeNotDispalyed',
            isDisplayed: false,
            kind: 'singleType',
          },
        ],
      })
    )
  ),
  rest.get('*/content-manager/components', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            uid: 'basic.relation',
            isDisplayed: true,
            apiID: 'relation',
            category: 'basic',
            info: {
              displayName: 'Relation',
            },
            options: {},
            attributes: {
              id: {
                type: 'integer',
              },
              categories: {
                type: 'relation',
                relation: 'oneToMany',
                target: 'api::category.category',
                targetModel: 'api::category.category',
                relationType: 'oneToMany',
              },
            },
          },
        ],
      })
    )
  )
);

const setup = () =>
  renderHook(() => useContentTypes(), {
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

describe('useContentTypes', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches models and content-types', async () => {
    const { result, waitFor } = setup();

    expect(result.current.isLoading).toBe(true);

    expect(result.current.components).toStrictEqual([]);
    expect(result.current.singleTypes).toStrictEqual([]);
    expect(result.current.collectionTypes).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.components).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: 'basic.relation',
        }),
      ])
    );

    expect(result.current.collectionTypes).toStrictEqual([
      expect.objectContaining({
        uid: 'admin::collectionType',
      }),
    ]);

    expect(result.current.singleTypes).toStrictEqual([
      expect.objectContaining({
        uid: 'admin::singleType',
      }),
    ]);
  });
});
