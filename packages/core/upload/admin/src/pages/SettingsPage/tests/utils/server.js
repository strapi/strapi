import { rest } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  rest.get('*/settings', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: { autoOrientation: true, responsiveDimensions: true, sizeOptimization: false },
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
