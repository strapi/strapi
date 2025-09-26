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

        strapi.log.info('CTB: updateSchema received, writing files');
        await getService('schema').updateSchema(data);

        // Prefer soft reset when available to avoid full process restart
        try {
          if (typeof (strapi as any).softReset === 'function') {
            strapi.log.info('CTB: invoking softReset');
            await (strapi as any).softReset();
            strapi.log.info('CTB: softReset finished');
            internals.isUpdating = false;
            ctx.body = { data: { softReset: true } };
            return;
          }
        } catch (e) {
          strapi.log.error('CTB: Soft reset failed, falling back to reload');
          strapi.log.error(e);
        }

        // Fallback to reload (existing behavior)
        setImmediate(() => {
          strapi.log.info('CTB: calling strapi.reload() (fallback)');
          strapi.reload();
        });

        ctx.body = { data: { softReset: false } };
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
