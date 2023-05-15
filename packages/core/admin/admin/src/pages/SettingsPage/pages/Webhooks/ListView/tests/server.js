import { setupServer } from 'msw/node';
import { rest } from 'msw';

const initialWebHooks = [
  { id: 1, isEnabled: true, name: 'test', url: 'http:://strapi.io' },
  { id: 2, isEnabled: false, name: 'test2', url: 'http://me.io' },
];

const handlers = [
  rest.get('*/webhooks', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: initialWebHooks,
      })
    );
  }),
  rest.post('*/webhooks/batch-delete', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [],
      })
    );
  }),
  rest.delete('*/webhooks/:id', (req, res, ctx) => {
    const { id } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        data: initialWebHooks.filter((webhook) => webhook.id !== Number(id)),
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
