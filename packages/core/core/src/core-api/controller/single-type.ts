import { isObject } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Schema, CoreApi, Utils, Common } from '@strapi/types';

interface Options {
  contentType: Schema.SingleType;
}

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({
  contentType,
}: Options): Utils.PartialWithThis<CoreApi.Controller.SingleType> => {
  const uid = contentType.uid as Common.UID.Service;

  // TODO: transform into a class
  return {
    /**
     * Retrieve single type content
     *
     */
    async find(ctx) {
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const entity = await strapi.service(uid).find(sanitizedQuery);

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * create or update single type content.
     */
    async update(ctx) {
      const { query, body = {} } = ctx.request;

      if (!isObject(body.data)) {
        throw new errors.ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(body.data, ctx);

      const entity = await strapi.service(uid).createOrUpdate({
        ...query,
        data: sanitizedInputData,
      });

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    async delete(ctx) {
      const { query } = ctx;

      await strapi.service(uid).delete(query);

      ctx.status = 204;
    },
  };
};

export { createSingleTypeController };
