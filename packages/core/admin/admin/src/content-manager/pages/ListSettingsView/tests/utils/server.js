import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.put('*/content-types/:slug/configuration', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: {
          data: {},
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
