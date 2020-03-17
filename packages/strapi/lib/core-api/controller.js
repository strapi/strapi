'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

/**
 * default bookshelf controller
 *
 */
module.exports = ({ service, model }) => {
  if (model.kind === 'singleType') {
    return createSingleTypeController({ model, service });
  }

  return createCollectionTypeController({ model, service });
};

/**
 * Returns a single type controller to handle default core-api actions
 */
const createSingleTypeController = ({ model, service }) => {
  return {
    /**
     * Retrieve single type content
     *
     * @return {Object|Array}
     */
    async find() {
      const entity = await service.find();
      return sanitizeEntity(entity, { model });
    },

    /**
     * create or update single type content.
     *
     * @return {Object}
     */
    async update(ctx) {
      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.createOrUpdate(data, { files });
      } else {
        entity = await service.createOrUpdate(ctx.request.body);
      }

      return sanitizeEntity(entity, { model });
    },

    async delete() {
      const entity = await service.delete();
      return sanitizeEntity(entity, { model });
    },
  };
};

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({ model, service }) => {
  return {
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      let entities;
      if (ctx.query._q) {
        entities = await service.search(ctx.query);
      } else {
        entities = await service.find(ctx.query);
      }

      return entities.map(entity => sanitizeEntity(entity, { model }));
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
      const entity = await service.findOne({ id: ctx.params.id });
      return sanitizeEntity(entity, { model });
    },

    /**
     * Count records.
     *
     * @return {Number}
     */
    count(ctx) {
      if (ctx.query._q) {
        return service.countSearch(ctx.query);
      }
      return service.count(ctx.query);
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */
    async create(ctx) {
      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.create(data, { files });
      } else {
        entity = await service.create(ctx.request.body);
      }
      return sanitizeEntity(entity, { model });
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */
    async update(ctx) {
      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await service.update({ id: ctx.params.id }, data, { files });
      } else {
        entity = await service.update({ id: ctx.params.id }, ctx.request.body);
      }

      return sanitizeEntity(entity, { model });
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
      const entity = await service.delete({ id: ctx.params.id });
      return sanitizeEntity(entity, { model });
    },
  };
};
