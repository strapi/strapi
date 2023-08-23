import * as React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useReviewWorkflows } from '../useReviewWorkflows';

const server = setupServer(
  rest.get(
    '*/content-manager/collection-types/api::collection.collection/stages',
    (req, res, ctx) =>
      res(
        ctx.json({
          data: [
            {
              id: 1,
              name: 'Todo',
            },

            {
              id: 2,
              name: 'Done',
            },
          ],

          meta: {
            workflowCount: 10,
            stagesCount: 5,
          },
        })
      )
  ),

  rest.get('*/content-manager/single-types/api::single.single/stages', (req, res, ctx) =>
    res(
      ctx.json({
        data: [
          {
            id: 2,
            name: 'Todo',
          },

          {
            id: 3,
            name: 'Done',
          },
        ],

        meta: {
          workflowCount: 10,
          stagesCount: 5,
        },
      })
    )
  )
);

const setup = (...args) =>
  renderHook(() => useReviewWorkflows(...args), {
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

describe('useReviewWorkflows', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetches many workflows', async () => {
    const { result } = setup();

    await waitFor(() => result.current.isLoading === false);
  });

  test('fetches one workflow', async () => {
    const { result } = setup({ id: 1 });

    await waitFor(() => result.current.isLoading === false);
  });

  test('forwards all params except "id" as query params', async () => {
    const { result } = setup({ id: 1 });

    await waitFor(() => result.current.isLoading === false);
  });
});
