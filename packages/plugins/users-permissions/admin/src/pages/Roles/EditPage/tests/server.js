import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  // Mock get role route
  rest.get('*/users-permissions/roles/:roleId', (req, res, ctx) => {
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
            application: {
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
  rest.put('*/users-permissions/roles/:roleId', (req, res, ctx) => {
    return res(ctx.delay(500), ctx.status(200), ctx.json({ ok: true }));
  }),

  // Mock get all routes route
  rest.get('*/users-permissions/routes', (req, res, ctx) => {
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
  rest.get('*/users-permissions/permissions', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: 113,
            action: 'plugin::content-manager.explorer.create',
            subject: 'plugin::users-permissions.user',
            properties: {
              fields: [
                'username',
                'email',
                'provider',
                'password',
                'resetPasswordToken',
                'confirmationToken',
                'confirmed',
                'blocked',
                'role',
                'picture',
              ],
            },
            conditions: [],
          },
        ],
      })
    );
  }),

  // Mock policies route
  rest.get('*/users-permissions/policies', (req, res, ctx) => {
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
