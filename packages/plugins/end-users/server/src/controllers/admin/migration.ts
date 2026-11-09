import type Koa from 'koa';
import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { PLUGIN_ID } from '../../constants';
import type migrationService from '../../services/migration';

/** `/end-users/migration`: the status the Migration section draws, and acknowledging an item. */
const migrationController = ({ strapi }: { strapi: Core.Strapi }) => {
  const migration = () =>
    strapi.plugin(PLUGIN_ID).service('migration') as ReturnType<typeof migrationService>;

  return {
    async status(ctx: Koa.Context) {
      ctx.body = { data: await migration().status() };
    },

    async updateItem(ctx: Koa.Context) {
      const resolved = ctx.request.body?.resolved;

      if (typeof resolved !== 'boolean') {
        throw new errors.ValidationError('resolved must be true or false');
      }

      ctx.body = { data: await migration().updateItem(ctx.params.id, resolved) };
    },
  };
};

export default migrationController;
