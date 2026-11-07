import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import type providerService from '../../services/provider';

/**
 * `/end-users/providers`: the sign-in providers an administrator configures. Answers are
 * `{ data }`. The service checks the body, and no answer or error carries a secret.
 */
const providerController = ({ strapi }: { strapi: Core.Strapi }) => {
  const providers = () =>
    strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<typeof providerService>;

  return {
    async find(ctx: Koa.Context) {
      ctx.body = { data: await providers().list() };
    },

    async findOne(ctx: Koa.Context) {
      ctx.body = { data: await providers().get(ctx.params.id) };
    },

    async create(ctx: Koa.Context) {
      ctx.body = { data: await providers().create(ctx.request.body) };
    },

    async update(ctx: Koa.Context) {
      ctx.body = { data: await providers().update(ctx.params.id, ctx.request.body) };
    },

    async delete(ctx: Koa.Context) {
      await providers().delete(ctx.params.id);

      ctx.body = { data: { ok: true } };
    },
  };
};

export default providerController;
