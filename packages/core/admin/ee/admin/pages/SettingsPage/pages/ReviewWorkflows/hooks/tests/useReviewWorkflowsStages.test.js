import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useReviewWorkflowsStages } from '../useReviewWorkflowsStages';

const server = setupServer(
  ...[
    rest.get('*/content-manager/collection-types/:uid/:id/stages', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              name: 'Default',
            },
          ],

          meta: {
            workflowCount: 10,
          },
        })
      )
    ),

    rest.get('*/content-manager/single-types/:uid/:id/stages', (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              name: 'Default',
            },
          ],

          meta: {
            workflowCount: 10,
          },
        })
      )
    ),
  ]
);

const setup = (...args) =>
  renderHook(() => useReviewWorkflowsStages(...args), {
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

describe('useReviewWorkflowsStages', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches stages for collection-types', async () => {
    const { result } = setup({
      id: 1,
      layout: {
        uid: 'api::collection.collection',
        kind: 'collectionType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({}));

    await waitFor(() => result.current.isLoading === false);

    expect(result.current.stages).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.meta).toStrictEqual(
      expect.objectContaining({
        workflowCount: expect.any(Number),
      })
    );
  });

  test('fetches stages for single-types', async () => {
    const { result } = setup({
      id: 1,
      layout: {
        uid: 'api::single.single',
        kind: 'singleType',
      },
    });

    await waitFor(() => expect(result.current.stages).toStrictEqual([]));
    await waitFor(() => expect(result.current.meta).toStrictEqual({}));

    await waitFor(() => result.current.isLoading === false);

    expect(result.current.stages).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 1,
        }),
      ])
    );

    expect(result.current.meta).toStrictEqual(
      expect.objectContaining({
        workflowCount: expect.any(Number),
      })
    );
  });
});
