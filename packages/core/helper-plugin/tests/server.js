import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  ...[
    rest.post('/admin/permissions/check', async (req, res, ctx) => {
      return res(
        ctx.json({
          data: [true],
        })
      );
    }),
    rest.get('/use-fetch-client-test', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            results: [
              { id: 2, name: 'newest', publishedAt: null },
              { id: 1, name: 'oldest', publishedAt: null },
            ],
            pagination: { page: 1, pageCount: 10 },
          },
        })
      );
    }),
  ]
);
