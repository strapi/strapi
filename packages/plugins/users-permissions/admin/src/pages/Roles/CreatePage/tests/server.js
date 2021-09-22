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
];

const server = setupServer(...handlers);

export default server;
