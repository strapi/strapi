import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('*/advanced', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        roles: [{ name: 'Authenticated', type: 'authenticated' }],
        settings: {
          allow_register: false,
          default_role: 'authenticated',
          email_confirmation: false,
          email_confirmation_redirection: '',
          email_reset_password: 'https://cat-bounce.com/',
          unique_email: false,
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
