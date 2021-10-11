import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('*/upload/files*', (req, res, ctx) => {
    return res(ctx.json({ results: [] }));
  })
);

export default server;
