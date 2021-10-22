import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/users', (req, res, ctx) => {
    const { pageSize, page } = req.params;

    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        data: {
          pagination: { page, pageSize, pageCount: 2, total: 2 },
          results: [
            {
              email: 'soup@strapi.io',
              firstname: 'soup',
              id: 1,
              isActive: true,
              lastname: 'soupette',
              roles: [
                {
                  id: 1,
                  name: 'Super Admin',
                },
              ],
            },
            {
              email: 'dummy@strapi.io',
              firstname: 'dummy',
              id: 2,
              isActive: false,
              lastname: 'dum test',
              roles: [
                {
                  id: 1,
                  name: 'Super Admin',
                },
                {
                  id: 2,
                  name: 'Editor',
                },
              ],
            },
          ],
        },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
