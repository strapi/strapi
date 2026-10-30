import { emitAudit, errors } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import { AUDIT_EVENTS } from '../audit-logs';
import { getService } from '../utils';

export const createSettingsController = ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    ctx.body = { data: { settings: await getService(strapi, 'settings').get() } };
  },

  async update(ctx: Context) {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;

    if (
      body.requireReviewBeforePublish !== undefined &&
      typeof body.requireReviewBeforePublish !== 'boolean'
    ) {
      throw new errors.ValidationError('"requireReviewBeforePublish" must be a boolean');
    }

    const service = getService(strapi, 'settings');
    const previous = await service.get();
    const settings = await service.set(body);

    if (previous.requireReviewBeforePublish !== settings.requireReviewBeforePublish) {
      await emitAudit({ strapi }, AUDIT_EVENTS.SETTINGS_UPDATE, {
        changes: {
          requireReviewBeforePublish: {
            from: previous.requireReviewBeforePublish,
            to: settings.requireReviewBeforePublish,
          },
        },
      });
    }

    ctx.body = { data: { settings } };
  },
});
