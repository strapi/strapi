import { rest } from 'msw';
import { setupServer, SetupServer } from 'msw/node';

export const server: SetupServer = setupServer(
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
    rest.get('/test-fetch-client', (req, res, ctx) => {
      return res(ctx.status(200));
    }),
  ]
);
