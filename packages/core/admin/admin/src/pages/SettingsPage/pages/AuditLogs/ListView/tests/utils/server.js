import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/audit-logs', (req, res, ctx) => {
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        results: [
          {
            id: 1,
            action: 'role.create',
            date: '2022-12-27T10:02:06.598Z',
            user: {
              id: 1,
              fullname: 'test user',
              email: 'test@test.com',
            },
          },
          {
            id: 2,
            action: 'role.delete',
            date: '2022-12-27T16:28:08.977Z',
            user: {
              id: 1,
              fullname: 'test user',
              email: 'test@test.com',
            },
          },
          {
            id: 3,
            action: 'entry.create',
            date: '2022-12-27T17:34:00.673Z',
            user: null,
          },
          {
            id: 4,
            action: 'admin.logout',
            date: '2022-12-27T17:51:04.146Z',
            user: {
              id: 1,
              fullname: 'test user',
              email: 'test@test.com',
            },
          },
        ],
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
