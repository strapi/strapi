import type { Context } from 'koa';
import { isEmpty } from 'lodash';

import { getService } from '../utils';
import { validateUpdateSchema } from './validation/schema';

export default () => {
  const internals = {
    isUpdating: false,
    // Held from the first line of updateSchema until it returns. isUpdating
    // means this request turned the watcher off, so it cannot be claimed
    // before validation.
    hasRequestInFlight: false,
  };

  return {
    async getSchema(ctx: Context) {
      const schema = await getService('schema').getSchema();

      ctx.send({ data: schema });
    },

    async updateSchema(ctx: Context) {
      if (internals.isUpdating === true || internals.hasRequestInFlight === true) {
        return ctx.conflict('Schema update is already in progress.');
      }

      // Claim the in-process lock before any await. Validation and the schema
      // write both yield, so a check that happens only after those awaits lets
      // a second request pass the guard and apply a second update.
      internals.hasRequestInFlight = true;

      try {
        const { data } = await validateUpdateSchema(ctx.request.body);

        if (
          isEmpty(data.components) &&
          isEmpty(data.contentTypes) &&
          isEmpty(data.contentStructure)
        ) {
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
      } finally {
        internals.hasRequestInFlight = false;
      }
    },

    async getUpdateSchemaStatus(ctx: Context) {
      ctx.send({ data: { isUpdating: internals.isUpdating } });
    },
  };
};
