import type Koa from 'koa';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PROVIDER_ACTIONS } from '../../admin-actions';
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
      const { id } = ctx.params;
      const body = ctx.request.body;

      // `providers.update` is for a provider's plain settings. A custom provider, and "trust for
      // linking", can make an identity provider the admin controls sign in as an end user, so they
      // need `providers.custom`. Checked here because the route cannot know what a body changes.
      if (
        (await providers().needsCustomAccess(id, body)) &&
        !ctx.state.userAbility?.can(PROVIDER_ACTIONS.custom)
      ) {
        throw new errors.ForbiddenError(
          'Editing a custom provider or changing trust for linking needs the permission to manage custom providers and account linking'
        );
      }

      ctx.body = { data: await providers().update(id, body) };
    },

    async delete(ctx: Koa.Context) {
      await providers().delete(ctx.params.id);

      ctx.body = { data: { ok: true } };
    },
  };
};

export default providerController;
