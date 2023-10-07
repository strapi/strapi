import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  ...[
    /**
     *
     * ADMIN
     *
     */
    rest.get('/admin/roles/:id/permissions', (req, res, ctx) => {
      return res(
        ctx.json({
          data: [
            {
              id: 1,
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::address.address',
              properties: {
                fields: ['postal_code', 'categories'],
              },
              conditions: [],

              params: {
                some: req.url.searchParams.get('some'),
              },
            },
          ],
        })
      );
    }),
    /**
     *
     * CONTENT_MANAGER
     *
     */
    rest.put('/content-manager/content-types/:contentType/configuration', (req, res, ctx) => {
      return res(ctx.status(200));
    }),
  ]
);
