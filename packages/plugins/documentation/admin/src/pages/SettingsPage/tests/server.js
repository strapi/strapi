import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/getInfos', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        documentationAccess: { restrictedAccess: false },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
