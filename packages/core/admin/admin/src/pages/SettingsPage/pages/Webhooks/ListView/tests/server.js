import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/webhooks', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: [
          { id: 1, isEnabled: true, name: 'test', url: 'http:://strapi.io' },
          { id: 2, isEnabled: false, name: 'test2', url: 'http://me.io' },
        ],
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
