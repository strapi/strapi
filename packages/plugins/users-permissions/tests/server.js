'use strict';

const { setupServer } = require('msw/node');
const { rest } = require('msw');
const pluginId = require('../admin/src/pluginId').default;

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
];

const server = setupServer(...handlers);

module.exports = {
  server,
};
