import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/providers/options', (req, res, ctx) => {
    return res(
      ctx.delay(200),
      ctx.status(200),
      ctx.json({
        data: {
          autoRegister: true,
          defaultRole: '2',
        },
      })
    );
  }),
  rest.get('*/admin/roles', (req, res, ctx) => {
    return res(
      ctx.delay(200),
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: 1,
            name: 'Super Admin',
          },
          {
            id: 2,
            name: 'Editor',
          },
        ],
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
