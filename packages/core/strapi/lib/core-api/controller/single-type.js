'use strict';

const { transformResponse } = require('./transform');

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({ service, parseMultipartData, sanitize }) => {
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
      const { body, query } = ctx.request;

      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.createOrUpdate({ params: query, data, files });
      } else {
        entity = await service.createOrUpdate({ params: query, data: body });
      }

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
