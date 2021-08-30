'use strict';

const { parseMultipartData } = require('@strapi/utils');

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({ service, sanitize, transformResponse }) => {
  return {
    /**
     * Retrieve single type content
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      const { query } = ctx;
      const entity = await service.find({ params: query });
      return transformResponse(sanitize(entity));
    },

    /**
     * create or update single type content.
     *
     * @return {Object}
     */
    async update(ctx) {
      const { query } = ctx.request;
      const { data, files } = parseMultipartData(ctx);

      const entity = await service.createOrUpdate({ params: query, data, files });

      return transformResponse(sanitize(entity));
    },

    async delete(ctx) {
      const { query } = ctx;

      const entity = await service.delete({ params: query });
      return transformResponse(sanitize(entity));
    },
  };
};

module.exports = createSingleTypeController;
