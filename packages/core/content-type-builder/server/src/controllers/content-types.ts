import _ from 'lodash';
import type { Context } from 'koa';
import type {} from 'koa-body';
import type { Internal } from '@strapi/types';
import { getService } from '../utils';
import {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
  validateKind,
} from './validation/content-type';
import { isContentTypeVisible, isContentTypeEditable } from '../services/content-types';

/**
 * Telemetry uses a bounded HTTP timeout (~1s in the metrics sender); cap how long we defer
 * dev reload so a stuck client cannot block restart indefinitely.
 */
const RELOAD_AFTER_TELEMETRY_MAX_MS = 2500;

const scheduleReloadAfterOutboundTelemetry = (sendPromise: Promise<unknown>): void => {
  setImmediate(() => {
    const settled = sendPromise.catch(() => {});
    Promise.race([
      settled,
      new Promise<void>((resolve) => {
        setTimeout(resolve, RELOAD_AFTER_TELEMETRY_MAX_MS);
      }),
    ])
      .catch(() => {})
      .finally(() => {
        strapi.reload();
      });
  });
};

export default {
  async getContentTypes(ctx: Context) {
    const { kind } = ctx.query;

    try {
      await validateKind(kind);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const contentTypeService = getService('content-types');

    const contentTypes = Object.keys(strapi.contentTypes)
      .filter(
        (uid) =>
          !kind ||
          _.get(strapi.contentTypes[uid as Internal.UID.ContentType], 'kind', 'collectionType') ===
            kind
      )
      .map((uid) =>
        contentTypeService.formatContentType(strapi.contentTypes[uid as Internal.UID.ContentType])
      );

    ctx.send({
      data: contentTypes,
    });
  },

  getContentType(ctx: Context) {
    const { uid } = ctx.params;

    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    if (!isContentTypeVisible(contentType)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    const contentTypeService = getService('content-types');

    ctx.send({ data: contentTypeService.formatContentType(contentType) });
  },

  async createContentType(ctx: Context) {
    const body = ctx.request.body as any;

    try {
      await validateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    try {
      strapi.reload.isWatching = false;

      const contentTypeService = getService('content-types');

      const contentType = await contentTypeService.createContentType({
        contentType: body.contentType,
        components: body.components,
      });

      const metricsPayload = {
        eventProperties: {
          kind: contentType.kind,
        },
      };

      const telemetryPromise = _.isEmpty(strapi.apis)
        ? strapi.telemetry.send('didCreateFirstContentType', metricsPayload)
        : strapi.telemetry.send('didCreateContentType', metricsPayload);

      scheduleReloadAfterOutboundTelemetry(telemetryPromise);

      ctx.send({ data: { uid: contentType.uid } }, 201);
    } catch (err) {
      strapi.log.error(err);
      strapi.telemetry
        .send('didNotCreateContentType', {
          eventProperties: { error: (err as Error).message || err },
        })
        .catch(() => {});
      ctx.send({ error: (err as Error).message || 'Unknown error' }, 400);
    }
  },

  async updateContentType(ctx: Context) {
    const { uid } = ctx.params;
    const body = ctx.request.body as any;

    if (!_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    if (!isContentTypeEditable(strapi.contentTypes[uid])) {
      return ctx.send({ error: 'contentType.programmatic.readonly' }, 400);
    }

    try {
      await validateUpdateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    try {
      strapi.reload.isWatching = false;

      const contentTypeService = getService('content-types');

      const component = await contentTypeService.editContentType(uid, {
        contentType: body.contentType,
        components: body.components,
      });

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: component.uid } }, 201);
    } catch (error) {
      strapi.log.error(error);
      ctx.send({ error: (error as Error)?.message || 'Unknown error' }, 400);
    }
  },

  async deleteContentType(ctx: Context) {
    const { uid } = ctx.params;

    if (!_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    if (!isContentTypeEditable(strapi.contentTypes[uid])) {
      return ctx.send({ error: 'contentType.programmatic.readonly' }, 400);
    }

    try {
      strapi.reload.isWatching = false;

      const contentTypeService = getService('content-types');

      const component = await contentTypeService.deleteContentType(uid);

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: component.uid } });
    } catch (error) {
      strapi.log.error(error);
      ctx.send({ error: (error as Error)?.message || 'Unknown error' }, 400);
    }
  },
};
