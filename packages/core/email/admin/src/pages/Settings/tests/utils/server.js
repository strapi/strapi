import { rest } from 'msw';
import { setupServer } from 'msw/node';

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
