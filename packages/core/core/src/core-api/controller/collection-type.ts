import { isObject } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Core, Struct, Utils, UID } from '@strapi/types';
import type Koa from 'koa';

interface Options {
  contentType: Struct.CollectionTypeSchema;
}

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const getAuditLogService = () => strapi.get('content-audit-logs');

const safeLog = async (handler: () => Promise<void>) => {
  try {
    await handler();
  } catch (error) {
    strapi.log.error('Failed to record content audit log entry', error as Error);
  }
};

const createCollectionTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<Core.CoreAPI.Controller.CollectionType> => {
  const uid = contentType.uid as UID.Service;

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
      const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as Record<
        string,
        unknown
      > & { id?: string | number };

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Create a record.
     */
    async create(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const { body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const entity = await strapi.service(uid).create({
        ...sanitizedQuery,
        data: sanitizedInputData,
      });

      const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as Record<
        string,
        unknown
      > & { id?: string | number };

      strapi.log.info('[audit-log] collection create captured', {
        uid,
        recordId: sanitizedEntity?.id ?? entity.id,
      });

      await safeLog(() =>
        getAuditLogService().logCreate({
          uid,
          recordId: sanitizedEntity?.id ?? entity.id,
          userId: ctx.state.user?.id,
          entry: sanitizedEntity,
        })
      );

      ctx.status = 201;
      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Update a record.
     */
    async update(ctx: Koa.Context) {
      const { id } = ctx.params;
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const { body = {} as any } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      await this.validateInput(body.data, ctx);

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const existingEntity = await strapi.service(uid).findOne(id, sanitizedQuery);
      const sanitizedBefore = existingEntity
        ? ((await this.sanitizeOutput(existingEntity, ctx)) as Record<string, unknown>)
        : null;

      const entity = await strapi.service(uid).update(id, {
        ...sanitizedQuery,
        data: sanitizedInputData,
      });

      const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as Record<
        string,
        unknown
      > & { id?: string | number };

      await safeLog(() =>
        getAuditLogService().logUpdate({
          uid,
          recordId: sanitizedEntity?.id ?? id,
          userId: ctx.state.user?.id,
          before: sanitizedBefore,
          after: sanitizedEntity,
        })
      );

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Destroy a record.
     */
    async delete(ctx) {
      const { id } = ctx.params;
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const existingEntity = await strapi.service(uid).findOne(id, sanitizedQuery);
      const sanitizedEntity = existingEntity
        ? ((await this.sanitizeOutput(existingEntity, ctx)) as Record<string, unknown> & {
            id?: string | number;
          })
        : null;

      await strapi.service(uid).delete(id, sanitizedQuery);

      if (sanitizedEntity) {
        await safeLog(() =>
          getAuditLogService().logDelete({
            uid,
            recordId: sanitizedEntity?.id ?? id,
            userId: ctx.state.user?.id,
            entry: sanitizedEntity,
          })
        );
      }

      ctx.status = 204;
    },
  };
};

export { createCollectionTypeController };
