import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  ...[
    rest.get('/upload/configuration', async (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            /**
             * we send the pageSize slightly different to defaults because
             * in tests we can track that the async functions have finished.
             */
            pageSize: 20,
            sort: 'updatedAt:DESC',
          },
        })
      );
    }),
    rest.put('/upload/configuration', async (req, res, ctx) => {
      return res(ctx.status(200));
    }),
  ]
);
