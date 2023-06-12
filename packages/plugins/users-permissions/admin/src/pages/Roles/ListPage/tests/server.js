import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
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

export default server;
