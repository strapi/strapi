import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/email-templates', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        email_confirmation: {
          display: 'Email.template.email_confirmation',
          options: {
            from: {
              email: 'mochoko@strapi.io',
              name: 'Administration Panel',
            },
            message: 'Thank you for registering. Please click on the link below.',
            object: 'Account confirmation',
            response_email: '',
          },
        },
        reset_password: {
          display: 'Email.template.reset_password',
          options: {
            from: {
              email: 'mochoko@strapi.io',
              name: 'Administration Panel',
            },
            message: 'We heard that you lost your password. Sorry about that!',
            object: 'Reset password',
            response_email: '',
          },
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
