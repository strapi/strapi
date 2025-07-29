import type { Context } from 'koa';
import { isEmpty } from 'lodash/fp';

import { getService } from '../utils';
import { validateUpdateSchema } from './validation/schema';

export default () => {
  const internals = {
    isUpdating: false,
  };

  return {
    async getSchema(ctx: Context) {
      const schema = await getService('schema').getSchema();

      ctx.send({ data: schema });
    },

    async updateSchema(ctx: Context) {
      if (internals.isUpdating === true) {
        return ctx.conflict('Schema update is already in progress.');
      }

      try {
        const { data } = await validateUpdateSchema(ctx.request.body);

        if (isEmpty(data.components) && isEmpty(data.contentTypes)) {
          ctx.body = {};
          return;
        }

        internals.isUpdating = true;
        strapi.reload.isWatching = false;

        await getService('schema').updateSchema(data);

        // NOTE: we do not set isUpdating to false here.
        // We want to wait for the server to restart to get the isUpdate = false only
        setImmediate(() => {
          strapi.reload();
        });

        ctx.body = {};
      } catch (error) {
        internals.isUpdating = false;
        const errorMessage = error instanceof Error ? error.message : String(error);
        return ctx.send({ error: errorMessage }, 400);
      }
    },

    async getUpdateSchemaStatus(ctx: Context) {
      ctx.send({ data: { isUpdating: internals.isUpdating } });
    },
  };
};
