import { setupServer } from 'msw/node';
import { rest } from 'msw';

const handlers = [
  rest.delete('*/upload/files/8', (req, res, ctx) => {
    return res(ctx.status(200));
  }),
];

const server = setupServer(...handlers);

export default server;
