import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/email/settings', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        config: {
          provider: '',
          settings: { defaultFrom: '', defaultReplyTo: '', testAddress: '' },
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
