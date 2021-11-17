'use strict';

const { isObject } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;

const { parseBody } = require('./transform');

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({
  service,
  sanitizeInput,
  sanitizeOutput,
  transformResponse,
}) => {
  return {
    /**
     * Retrieve single type content
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      const { query } = ctx;

      const entity = await service.find(query);
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },

    /**
     * create or update single type content.
     *
     * @return {Object}
     */
    async update(ctx) {
      const { query } = ctx.request;
      const { data, files } = parseBody(ctx);

      if (!isObject(data)) {
        throw new ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await sanitizeInput(data, ctx);

      const entity = await service.createOrUpdate({ ...query, data: sanitizedInputData, files });
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },

    async delete(ctx) {
      const { query } = ctx;

      const entity = await service.delete(query);
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },
  };
};

module.exports = createSingleTypeController;
