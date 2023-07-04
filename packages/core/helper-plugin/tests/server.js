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
  ]
);
