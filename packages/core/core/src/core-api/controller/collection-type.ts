import { isObject } from 'lodash';
import { errors } from '@strapi/utils';
import type { Core, Struct, Utils, UID } from '@strapi/types';
import type Koa from 'koa';

import { createWriteGuard, localeOf } from './write-guard';

interface Options {
  contentType: Struct.CollectionTypeSchema;
}

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<Core.CoreAPI.Controller.CollectionType> => {
  const uid = contentType.uid as UID.Service;
  const guard = createWriteGuard(contentType);

  /**
   * Refuses (404) a write to an entry the caller's conditions don't match: the Document Service's
   * `update` and `delete` ignore filters. No query for API tokens and Users & Permissions.
   */
  const assertEntry = (
    ctx: Koa.Context,
    action: 'update' | 'delete' | 'publish',
    query: Record<string, unknown>
  ) =>
    strapi.contentAPI.permissions.assertEntry(
      ctx.state?.auth,
      action,
      contentType.uid as UID.ContentType,
      ctx.params.id,
      { locale: query.locale as string | string[] | undefined }
    );

  // TODO: transform into a class
  return {
    /**
     * Retrieve records.
     */
    async find(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const { results, pagination } = await strapi.service(uid).find(sanitizedQuery);
      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults, { pagination });
    },

    /**
     * Retrieve a record
     */
    async findOne(ctx) {
      const { id } = ctx.params;
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const entity = await strapi.service(uid).findOne(id, sanitizedQuery);
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Create a record.
     */
    async create(ctx) {
      guard.assertCanCreate(ctx);

      // Before the query is validated and sanitized: a caller without `publish` writes a draft
      const resolved = await guard.resolveStatus(ctx, {});

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const { body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      guard.markInputAction(ctx, 'create');

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const params = {
        ...sanitizedQuery,
        ...guard.statusParam(ctx, resolved),
        data: sanitizedInputData,
      };

      let entity;

      if (guard.isSubjectAware(ctx)) {
        // The data written must match the caller's `create` conditions, and a conditioned `publish`
        // can only be checked against the entry once it exists: both are judged in the transaction
        // that writes it, so a refusal leaves nothing behind (and no event, which waits for commit)
        entity = await strapi.db.transaction(async () => {
          const written = await strapi.service(uid).create(params);

          await guard.assertWritten(ctx, 'create', written, sanitizedQuery, resolved);

          if (!resolved.publishAfterCreate) {
            return written;
          }

          return guard.publishCreated(ctx, written, sanitizedQuery, (documentId, query) =>
            strapi.service(uid).findOne(documentId, query)
          );
        });
      } else {
        entity = await strapi.service(uid).create(params);
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      ctx.status = 201;
      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Update a record.
     */
    async update(ctx: Koa.Context) {
      const { id } = ctx.params;

      // An update of a locale the document has none in creates it: it is checked once written, and
      // is written as a create, by a caller who may create
      const adds = await guard.addsLocale(ctx, id);

      if (adds) {
        guard.assertCanCreate(ctx);
      }

      // Before the query is validated and sanitized: a caller without `publish` writes a draft
      const resolved = await guard.resolveStatus(
        ctx,
        adds ? { locale: localeOf(ctx) } : { documentId: id, locale: localeOf(ctx) }
      );

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      await assertEntry(ctx, 'update', sanitizedQuery);

      // An update that publishes replaces the published version: it must be the caller's too. A new
      // locale has none to replace
      if (!adds && guard.publishes(ctx, resolved)) {
        await assertEntry(ctx, 'publish', sanitizedQuery);
      }

      const { body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      if (adds) {
        guard.markCreates(ctx);
      }

      guard.markInputAction(ctx, 'update');

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const params = {
        ...sanitizedQuery,
        ...guard.statusParam(ctx, resolved),
        data: sanitizedInputData,
      };

      let entity;

      if (guard.isSubjectAware(ctx)) {
        // The entry the update adds must be the caller's to write once it exists, as the others
        // are before; the data written must match the caller's conditions for the action (`create`
        // for an added locale); and a conditioned `publish` is decided on the draft as written. All
        // are judged in the transaction that writes it, so a mismatch leaves nothing behind
        entity = await strapi.db.transaction(async () => {
          const written = await strapi.service(uid).update(id, params);

          if (adds) {
            await assertEntry(ctx, 'update', sanitizedQuery);
          }

          await guard.assertWritten(
            ctx,
            adds ? 'create' : 'update',
            written,
            sanitizedQuery,
            resolved
          );

          if (!resolved.publishAfterCreate) {
            return written;
          }

          return guard.publishCreated(ctx, written, sanitizedQuery, (documentId, query) =>
            strapi.service(uid).findOne(documentId, query)
          );
        });
      } else {
        entity = await strapi.service(uid).update(id, params);
      }

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Destroy a record.
     */
    async delete(ctx) {
      const { id } = ctx.params;
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      await assertEntry(ctx, 'delete', sanitizedQuery);

      await strapi.service(uid).delete(id, sanitizedQuery);

      ctx.status = 204;
    },
  };
};

export { createCollectionTypeController };
