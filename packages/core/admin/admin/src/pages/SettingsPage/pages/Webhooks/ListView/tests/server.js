import { setupServer } from 'msw/node';
import { rest } from 'msw';

const initialWebhooks = [
  { id: 1, isEnabled: true, name: 'test', url: 'http:://strapi.io' },
  { id: 2, isEnabled: false, name: 'test2', url: 'http://me.io' },
];

let webhooks = initialWebhooks;
export const resetWebhooks = () => {
  webhooks = initialWebhooks;
};

const handlers = [
  rest.get('*/webhooks', (req, res, ctx) => {
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json({
        data: webhooks,
      })
    );
  }),
  rest.post('*/webhooks/batch-delete', (req, res, ctx) => {
    webhooks = webhooks.filter((webhook) => !req.body.ids.includes(webhook.id));

    return res(
      ctx.status(200),
      ctx.json({
        data: webhooks,
      })
    );
  }),
  rest.put('*/webhooks/:id', (req, res, ctx) => {
    const { id } = req.params;
    const { isEnabled } = req.body;

    webhooks = webhooks.map((webhook) =>
      webhook.id === Number(id) ? { ...webhook, isEnabled } : webhook
    );

    return res(
      ctx.status(200),
      ctx.json({
        data: webhooks,
      })
    );
  }),
];

const server = setupServer(...handlers);

export default server;
