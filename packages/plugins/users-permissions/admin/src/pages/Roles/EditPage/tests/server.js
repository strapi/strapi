import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  // Mock get role route
  rest.get('*/users-permissions/roles/:roleId', (req, res, ctx) => {
    return res(
      ctx.delay(500),
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
];

const server = setupServer(...handlers);

export default server;
