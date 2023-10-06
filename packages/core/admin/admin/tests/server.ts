import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  ...[
    /**
     *
     * ADMIN
     *
     */

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
