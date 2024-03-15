import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  ...[
    rest.get('/content-manager/init', (req, res, ctx) => {
      return res(
        ctx.json({
          data: {
            contentTypes: [{ uid: 'api::article.article', options: { draftAndPublish: true } }],
            components: [],
          },
        })
      );
    }),
  ]
);
