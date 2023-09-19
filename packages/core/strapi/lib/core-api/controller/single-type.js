'use strict';

const { isObject } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;

const { parseBody } = require('./transform');

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({ contentType }) => {
  const { uid } = contentType;

  return {
    /**
     * Retrieve single type content
     *
     * @return {Object|Array}
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
     *
     * @return {Object}
     */
    async update(ctx) {
      const { query } = ctx.request;
      const { data, files } = parseBody(ctx);

      if (!isObject(data)) {
        throw new ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(data, ctx);

      const entity = await strapi
        .service(uid)
        .createOrUpdate({ ...query, data: sanitizedInputData, files });
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    async delete(ctx) {
      const { query } = ctx;

      const entity = await strapi.service(uid).delete(query);
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },
  };
};

module.exports = createSingleTypeController;
