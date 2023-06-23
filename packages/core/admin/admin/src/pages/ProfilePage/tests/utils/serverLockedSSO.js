import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('*/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          email: 'michka@michka.fr',
          firstname: 'michoko',
          lastname: 'ronronscelestes',
          username: 'yolo',
          preferedLanguage: 'en',
          roles: [
            {
              id: 1,
            },
          ],
        },
      })
    );
  }),
  rest.get('*/providers/isSSOLocked', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          isSSOLocked: true,
        },
      })
    );
  }),
];

const serverLockedSSO = setupServer(...handlers);

export default serverLockedSSO;
