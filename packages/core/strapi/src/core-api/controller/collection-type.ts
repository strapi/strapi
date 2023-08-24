import { isObject } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type Koa from 'koa';

import { parseBody } from './transform';
import type { CoreApi, Schema, Utils, Common } from '../../types';

interface Options {
  contentType: Schema.CollectionType;
}

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<CoreApi.Controller.CollectionType> => {
  const uid = contentType.uid as Common.UID.Service;

  return {
    /**
     * Retrieve records.
     */
    async find(ctx) {
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      const { results, pagination } = await strapi.service(uid).find(sanitizedQuery);
      const sanitizedResults = await this.sanitizeOutput(results, ctx);
      return this.transformResponse(sanitizedResults, { pagination });
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await strapi.service(uid).findOne(id, query);
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
      const { query } = ctx.request;

      const body = parseBody(ctx);

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const entity = await strapi.service(uid).create({
        ...query,
        data: sanitizedInputData,
        files: 'files' in body ? body.files : undefined,
      });
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx: Koa.Context) {
      const { id } = ctx.params;
      const { query } = ctx.request;

      const body = parseBody(ctx);

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const entity = await strapi.service(uid).update(id, {
        ...query,
        data: sanitizedInputData,
        files: 'files' in body ? body.files : undefined,
      });
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await strapi.service(uid).delete(id, query);
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },
  };
};

export default createCollectionTypeController;
