import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/providers', (req, res, ctx) => {
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        email: { enabled: true, icon: 'envelope' },
        discord: {
          callback: '/auth/discord/callback',
          enabled: false,
          icon: 'envelope',
          key: '',
          scope: ['identify', 'email'],
          secret: '',
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
