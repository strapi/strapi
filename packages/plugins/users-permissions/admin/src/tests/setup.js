import { rest } from 'msw';
import { setupServer } from 'msw/node';

import pluginId from '../pluginId';

const handlers = [
  // Mock get role route
  rest.get(`*/${pluginId}/roles/:roleId`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        role: {
          id: req.params.roleId,
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
          createdAt: '2021-09-08T16:26:18.061Z',
          updatedAt: '2021-09-08T16:26:18.061Z',
          permissions: {
            'api::address': {
              controllers: {
                address: {
                  create: {
                    enabled: false,
                    policy: '',
                  },
                },
              },
            },
          },
        },
      })
    );
  }),

  // Mock edit role route
  rest.put(`*/${pluginId}/roles/:roleId`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),

  // Mock create role route
  rest.post(`*/${pluginId}/roles`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ ok: true }));
  }),

  // Mock get all routes route
  rest.get(`*/${pluginId}/routes`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        routes: {
          'api::address': [
            {
              method: 'POST',
              path: '/addresses',
              handler: 'address.create',
              config: {
                policies: [],
                auth: {
                  scope: 'api::address.address.create',
                },
              },
              info: {
                apiName: 'address',
                type: 'content-api',
              },
            },
          ],
        },
      })
    );
  }),

  // Mock permissions route
  rest.get(`*/${pluginId}/permissions`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        permissions: {
          'api::address': {
            controllers: {
              address: {
                create: {
                  enabled: false,
                  policy: '',
                },
              },
            },
          },
        },
      })
    );
  }),

  rest.get('*/roles', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        roles: [
          {
            id: 1,
            name: 'Authenticated',
            description: 'Default role given to authenticated user.',
            type: 'authenticated',
            nb_users: 0,
          },
          {
            id: 2,
            name: 'Public',
            description: 'Default role given to unauthenticated user.',
            type: 'public',
            nb_users: 0,
          },
        ],
      })
    );
  }),

  rest.get('*/providers', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        email: { enabled: true, icon: 'envelope' },
        discord: {
          callback: '/auth/discord/callback',
          enabled: false,
          icon: 'discord',
          key: '',
          scope: ['identify', 'email'],
          secret: '',
        },
      })
    );
  }),

  rest.get('*/email-templates', (req, res, ctx) => {
    return res(
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

  rest.get('*/advanced', (req, res, ctx) => {
    return res(
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

beforeAll(() => {
  server.listen();
});

afterAll(() => {
  server.close();
});
