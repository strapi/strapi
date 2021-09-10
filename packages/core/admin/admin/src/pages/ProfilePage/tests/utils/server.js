import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/me', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: {
          email: 'michka@michka.fr',
          firstname: 'michoko',
          lastname: 'ronronscelestes',
          username: 'yolo',
          preferedLanguage: 'en',
        },
      })
    );
  }),
];

export const serverUsername = setupServer(...handlers);

const handlersNoUsername = [
  rest.get('*/me', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: {
          email: 'michoko@michka.fr',
          firstname: 'michoko',
          lastname: 'ronronscelestes',
          preferedLanguage: 'en',
        },
      })
    );
  }),
];

export const serverNoUsername = setupServer(...handlersNoUsername);
