'use strict';

const { transformResponse } = require('./transform');

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({ service, sanitize, parseMultipartData }) => {
  return {
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      const { query } = ctx;

      const { results, pagination } = await service.find({ params: query });

      return transformResponse(sanitize(results), { pagination });
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await service.findOne(id, { params: query });

      return transformResponse(sanitize(entity));
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
      const { body, query } = ctx.request;

      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.create({ params: query, data, files });
      } else {
        entity = await service.create({ params: query, data: body });
      }

      return transformResponse(sanitize(entity));
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx) {
      const { id } = ctx.params;
      const { body, query } = ctx.request;

      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.update(id, { params: query, data, files });
      } else {
        entity = await service.update(id, { params: query, data: body });
      }

      return transformResponse(sanitize(entity));
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await service.delete(id, { params: query });
      return transformResponse(sanitize(entity));
    },
  };
};

module.exports = createCollectionTypeController;
