'use strict';

const { parseBody } = require('./transform');

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({
  service,
  sanitizeInput,
  sanitizeOutput,
  transformResponse,
}) => {
  return {
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      const { query } = ctx;

      const { results, pagination } = await service.find(query);
      const sanitizedResults = await sanitizeOutput(results, ctx);

      return transformResponse(sanitizedResults, { pagination });
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await service.findOne(id, query);
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
      const { query } = ctx.request;

      const { data, files } = parseBody(ctx);
      const sanitizedInputData = await sanitizeInput(data, ctx);

      const entity = await service.create({ ...query, data: sanitizedInputData, files });
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
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
      const sanitizedInputData = await sanitizeInput(data, ctx);

      const entity = await service.update(id, { ...query, data: sanitizedInputData, files });
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
      const { id } = ctx.params;
      const { query } = ctx;

      const entity = await service.delete(id, query);
      const sanitizedEntity = await sanitizeOutput(entity, ctx);

      return transformResponse(sanitizedEntity);
    },
  };
};

module.exports = createCollectionTypeController;
