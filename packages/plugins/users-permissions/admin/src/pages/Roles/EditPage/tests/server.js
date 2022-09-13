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
    return res(ctx.delay(500), ctx.status(200), ctx.json({ ok: true }));
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
];

const server = setupServer(...handlers);

export default server;
