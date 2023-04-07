'use strict';

const { isObject } = require('lodash/fp');
const { ValidationError } = require('@strapi/utils').errors;

const { parseBody } = require('./transform');

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({ contentType }) => {
  const { uid } = contentType;

  return {
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
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

      const { data, files } = parseBody(ctx);

      if (!isObject(data)) {
        throw new ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(data, ctx);

      const entity = await strapi
        .service(uid)
        .create({ ...query, data: sanitizedInputData, files });
      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

      return this.transformResponse(sanitizedEntity);
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx) {
      const { id } = ctx.params;
      const { query } = ctx.request;

      const { data, files } = parseBody(ctx);

      if (!isObject(data)) {
        throw new ValidationError('Missing "data" payload in the request body');
      }

      const sanitizedInputData = await this.sanitizeInput(data, ctx);

      const entity = await strapi
        .service(uid)
        .update(id, { ...query, data: sanitizedInputData, files });
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

module.exports = createCollectionTypeController;
