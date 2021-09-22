import { setupServer } from 'msw/node';
import { rest } from 'msw';
import pluginId from '../../../../pluginId';

const handlers = [
  // Mock create role route
  rest.post(`*/${pluginId}/roles`, (req, res, ctx) => {
    return res(ctx.delay(100), ctx.status(200), ctx.json({ ok: true }));
  }),

  // Mock get permissions
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
];

const server = setupServer(...handlers);

export default server;
