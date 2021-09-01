'use strict';

const { parseBody } = require('./transform');

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({ service, sanitize, transformResponse }) => {
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
      const { query } = ctx.request;

      const { data, files } = parseBody(ctx);

      const entity = await service.create({ params: query, data, files });

      return transformResponse(sanitize(entity));
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

      const entity = await service.update(id, { params: query, data, files });

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
