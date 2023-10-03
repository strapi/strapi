import _ from 'lodash';
import { yup, validateYupSchema } from '@strapi/utils';

const urlRegex =
  /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)(?:\.(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/;

const webhookValidator = yup
  .object({
    name: yup.string().required(),
    url: yup.string().matches(urlRegex, 'url must be a valid URL').required(),
    headers: yup.lazy((data) => {
      if (typeof data !== 'object') {
        return yup.object().required();
      }

      return yup
        .object(
          // @ts-expect-error
          _.mapValues(data, () => {
            yup.string().min(1).required();
          })
        )
        .required();
    }),
    events: yup.array().of(yup.string()).required(),
  })
  .noUnknown();

const updateWebhookValidator = webhookValidator.shape({
  isEnabled: yup.boolean(),
});

export default {
  async listWebhooks(ctx: any) {
    const webhooks = await strapi.webhookStore.findWebhooks();
    ctx.send({ data: webhooks });
  },

  async getWebhook(ctx: any) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    ctx.send({ data: webhook });
  },

  async createWebhook(ctx: any) {
    const { body } = ctx.request;

    await validateYupSchema(webhookValidator)(body);

    const webhook = await strapi.webhookStore.createWebhook(body);

    strapi.webhookRunner.add(webhook);

    ctx.created({ data: webhook });
  },

  async updateWebhook(ctx: any) {
    const { id } = ctx.params;
    const { body } = ctx.request;

    await validateYupSchema(updateWebhookValidator)(body);

    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    const updatedWebhook = await strapi.webhookStore.updateWebhook(id, {
      ...webhook,
      ...body,
    });

    if (!updatedWebhook) {
      return ctx.notFound('webhook.notFound');
    }

    strapi.webhookRunner.update(updatedWebhook);

    ctx.send({ data: updatedWebhook });
  },

  async deleteWebhook(ctx: any) {
    const { id } = ctx.params;
    const webhook = await strapi.webhookStore.findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    await strapi.webhookStore.deleteWebhook(id);

    strapi.webhookRunner.remove(webhook);

    ctx.body = { data: webhook };
  },

  async deleteWebhooks(ctx: any) {
    const { ids } = ctx.request.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return ctx.badRequest('ids must be an array of id');
    }

    for (const id of ids) {
      const webhook = await strapi.webhookStore.findWebhook(id);

      if (webhook) {
        await strapi.webhookStore.deleteWebhook(id);
        strapi.webhookRunner.remove(webhook);
      }
    }

    ctx.send({ data: ids });
  },

  async triggerWebhook(ctx: any) {
    const { id } = ctx.params;

    const webhook = (await strapi.webhookStore.findWebhook(id)) as any;

    const response = await strapi.webhookRunner.run(webhook, 'trigger-test', {});

    ctx.body = { data: response };
  },
};
