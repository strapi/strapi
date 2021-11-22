import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('*/upload/files*', (req, res, ctx) => {
    return res(
      ctx.json({ results: [], pagination: { page: '1', pageSize: '10', pageCount: '1' } })
    );
  })
);

export default server;
