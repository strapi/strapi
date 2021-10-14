import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.get('*/getInfos', (req, res, ctx) => {
    return res(
      ctx.delay(1000),
      ctx.status(200),
      ctx.json({
        documentationAccess: { restrictedAccess: false, password: '' },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
