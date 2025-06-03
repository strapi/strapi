import isLocalhostIp from 'is-localhost-ip';
// Regular import references a deprecated node module,
// See https://www.npmjs.com/package/punycode.js#installation
import punycode from 'punycode/';
import type { Context } from 'koa';
import _ from 'lodash';

import { yup, validateYupSchema } from '@strapi/utils';

import type { Modules } from '@strapi/types';

import {
  CreateWebhook,
  DeleteWebhook,
  DeleteWebhooks,
  GetWebhook,
  UpdateWebhook,
  TriggerWebhook,
  GetWebhooks,
} from '../../../shared/contracts/webhooks';

const urlRegex =
  /^(?:([a-z0-9+.-]+):\/\/)(?:\S+(?::\S*)?@)?(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)(?:\.(?:[a-z\u00a1-\uffff0-9_]-*)*[a-z\u00a1-\uffff0-9_]+)*\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/;

const webhookValidator = yup
  .object({
    name: yup.string().required(),
    url: yup
      .string()
      .matches(urlRegex, 'url must be a valid URL')
      .required()
      .test(
        'is-public-url',
        "Url is not supported because it isn't reachable over the public internet",
        async (url) => {
          if (process.env.NODE_ENV !== 'production') {
            return true;
          }

          try {
            const parsedUrl = new URL(punycode.toASCII(url!));
            const isLocalUrl = await isLocalhostIp(parsedUrl.hostname);
            return !isLocalUrl;
          } catch {
            return false;
          }
        }
      ),
    headers: yup.lazy((data) => {
      if (typeof data !== 'object') {
        return yup.object().required();
      }

      return yup
        .object(
          // @ts-expect-error lodash types
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
  async listWebhooks(ctx: Context) {
    const webhooks = await strapi.get('webhookStore').findWebhooks();
    ctx.send({ data: webhooks } satisfies GetWebhooks.Response);
  },

  async getWebhook(ctx: Context) {
    const { id } = ctx.params;
    const webhook = await strapi.get('webhookStore').findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    ctx.send({ data: webhook } satisfies GetWebhook.Response);
  },

  async createWebhook(ctx: Context) {
    const { body } = ctx.request as CreateWebhook.Request;

    await validateYupSchema(webhookValidator)(body);

    const webhook = await strapi.get('webhookStore').createWebhook(body);

    strapi.get('webhookRunner').add(webhook);

    ctx.created({ data: webhook } satisfies CreateWebhook.Response);
  },

  async updateWebhook(ctx: Context) {
    const { id } = ctx.params as UpdateWebhook.Params;
    const { body } = ctx.request as UpdateWebhook.Request;

    await validateYupSchema(updateWebhookValidator)(body);

    const webhook = await strapi.get('webhookStore').findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    const updatedWebhook = await strapi.get('webhookStore').updateWebhook(id, {
      ...webhook,
      ...body,
    });

    if (!updatedWebhook) {
      return ctx.notFound('webhook.notFound');
    }

    strapi.get('webhookRunner').update(updatedWebhook);

    ctx.send({ data: updatedWebhook } satisfies UpdateWebhook.Response);
  },

  async deleteWebhook(ctx: Context) {
    const { id } = ctx.params;
    const webhook = await strapi.get('webhookStore').findWebhook(id);

    if (!webhook) {
      return ctx.notFound('webhook.notFound');
    }

    await strapi.get('webhookStore').deleteWebhook(id);

    strapi.get('webhookRunner').remove(webhook);

    ctx.body = { data: webhook } satisfies DeleteWebhook.Response;
  },

  async deleteWebhooks(ctx: Context) {
    const { ids } = ctx.request.body as DeleteWebhooks.Request['body'];

    if (!Array.isArray(ids) || ids.length === 0) {
      return ctx.badRequest('ids must be an array of id');
    }

    for (const id of ids) {
      const webhook = await strapi.get('webhookStore').findWebhook(id);

      if (webhook) {
        await strapi.get('webhookStore').deleteWebhook(id);
        strapi.get('webhookRunner').remove(webhook);
      }
    }

    ctx.send({ data: ids } satisfies DeleteWebhooks.Response);
  },

  async triggerWebhook(ctx: Context) {
    const { id } = ctx.params;

    const webhook = await strapi.get('webhookStore').findWebhook(id);

    const response = await strapi
      .get('webhookRunner')
      .run(webhook as Modules.WebhookStore.Webhook, 'trigger-test', {});

    ctx.body = { data: response } satisfies TriggerWebhook.Response;
  },
};
