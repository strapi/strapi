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
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

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

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

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

      const entity = await strapi.service(uid).update(id, {
        ...sanitizedQuery,
        data: sanitizedInputData,
      });

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

      await strapi.service(uid).delete(id, sanitizedQuery);

      ctx.status = 204;
    },
  };
};

export { createCollectionTypeController };
