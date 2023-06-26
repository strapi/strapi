import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useReviewWorkflows } from '../useReviewWorkflows';

const STAGE_FIXTURE = {
  id: 1,
  name: 'Stage 1',
};

const server = setupServer(
  rest.get('*/review-workflows/workflows', (req, res, ctx) => {
    const populate = req.url.searchParams.get('populate');

    return res(
      ctx.json({
        data: [
          {
            id: 1,
            stages: populate === 'stages' ? [STAGE_FIXTURE] : [],
          },
        ],

        pagination: {
          page: 1,
          pageSize: 100,
          pageCount: 1,
          total: 1,
        },
      })
    );
  }),

  rest.get('*/review-workflows/workflows/1', (req, res, ctx) => {
    const populate = req.url.searchParams.get('populate');

    return res(
      ctx.json({
        data: {
          id: 1,
          stages: populate === 'stages' ? [STAGE_FIXTURE] : [],
        },

        pagination: {
          page: 1,
          pageSize: 100,
          pageCount: 1,
          total: 1,
        },
      })
    );
  })
);

function setup(id) {
  return renderHook(() => useReviewWorkflows(id), {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <IntlProvider locale="en" messages={{}}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </IntlProvider>
      );
    },
  });
}

describe('useReviewWorkflows', () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  test('fetch all workflows when calling the hook without a workflow id', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        status: 'success',
        pagination: expect.objectContaining({ total: 1 }),
        workflows: [{ id: expect.any(Number), stages: expect.any(Array) }],
      })
    );
  });

  test('fetch a single workflow when calling the hook with a workflow id', async () => {
    const { result } = setup({ id: 1 });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toStrictEqual(
      expect.objectContaining({
        pagination: expect.objectContaining({ total: 1 }),
        workflows: [expect.objectContaining({ id: 1, stages: expect.any(Array) })],
      })
    );
  });
});
