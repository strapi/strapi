import _ from 'lodash';
import type { Context } from 'koa';
import type {} from 'koa-body';
import type { Internal } from '@strapi/types';
import { isObject } from 'lodash/fp';
import { MigrationBuilder } from '../services/migration-builder';
import { getService } from '../utils';
import {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
  validateKind,
} from './validation/content-type';

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

      if (_.isEmpty(strapi.apis)) {
        await strapi.telemetry.send('didCreateFirstContentType', metricsPayload);
      } else {
        await strapi.telemetry.send('didCreateContentType', metricsPayload);
      }

      setImmediate(() => strapi.reload());

      ctx.send({ data: { uid: contentType.uid } }, 201);
    } catch (err) {
      strapi.log.error(err);
      await strapi.telemetry.send('didNotCreateContentType', {
        eventProperties: { error: (err as Error).message || err },
      });
      ctx.send({ error: (err as Error).message || 'Unknown error' }, 400);
    }
  },

  async updateContentType(ctx: Context) {
    const { uid } = ctx.params;
    const body = ctx.request.body as any;

    if (!_.has(strapi.contentTypes, uid)) {
      return ctx.send({ error: 'contentType.notFound' }, 404);
    }

    try {
      await validateUpdateContentTypeInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    try {
      strapi.reload.isWatching = false;

      const contentTypeService = getService('content-types');

      // Find attributes with a `renamed` field that contains the original name
      const renamedAttributes = Object.entries(body.contentType.attributes || {})
        .filter(([, value]) => value && typeof value === 'object' && 'renamed' in value) // Check for `renamed` field
        .map(([key, value]) => {
          if (!isObject(value) || !('renamed' in value)) {
            return undefined;
          }
          const oldName = value.renamed; // Original name is in the `renamed` field
          const newName = key; // New name is the current key
          return { oldName, newName };
        })
        .filter((item) => item);
      if (
        renamedAttributes.length &&
        strapi.config.get('database.settings.automigrate.attributes', true)
      ) {
        const migrationBuilder = new MigrationBuilder();
        renamedAttributes.forEach((attr: { oldName: string; newName: string }) => {
          migrationBuilder.addRenameAttribute(uid, attr);
        });
        await migrationBuilder.writeFiles();
      }

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
