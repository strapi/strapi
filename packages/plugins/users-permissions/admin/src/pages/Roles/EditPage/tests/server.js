import { setupServer } from 'msw/node';
import { rest } from 'msw';
import pluginId from '../../../../pluginId';

const handlers = [
  // Mock get role route
  rest.get(`*/${pluginId}/roles/:roleId`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        role: {
          id: req.params.roleId,
          name: 'Authenticated',
          description: 'Default role given to authenticated user.',
          type: 'authenticated',
          created_at: '2021-09-08T16:26:18.061Z',
          updated_at: '2021-09-08T16:26:18.061Z',
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
    return res(ctx.delay(500), ctx.status(200), ctx.json({ ok: true }));
  }),

  // Mock get all routes route
  rest.get(`*/${pluginId}/routes`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        routes: {
          application: [],
          'content-manager': [
            {
              method: 'GET',
              path:
                '/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-manager/content-types',
              handler: 'content-types.findContentTypes',
              config: {
                policies: ['plugin::users-permissions.permissions'],
              },
            },
          ],
          'content-type-builder': [
            {
              method: 'DELETE',
              path:
                '/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/content-type-builder/component-categories/:name',
              handler: 'component-categories.deleteCategory',
              config: {
                policies: [
                  'plugin::users-permissions.permissions',
                  {
                    name: 'admin::hasPermissions',
                    options: {
                      actions: ['plugin::content-type-builder.read'],
                    },
                  },
                ],
              },
            },
          ],
          email: [
            {
              method: 'POST',
              path:
                '/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/email/',
              handler: 'Email.send',
              config: {
                policies: ['plugin::users-permissions.permissions'],
                description: 'Send an email',
                tag: {
                  plugin: 'email',
                  name: 'Email',
                },
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
      ctx.delay(100),
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

  // Mock policies route
  rest.get(`*/${pluginId}/policies`, (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        policies: ['isAuthenticated', 'rateLimit'],
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
