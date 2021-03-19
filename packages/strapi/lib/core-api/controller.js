'use strict';

const _ = require('lodash');
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

const createSanitizeFn = model => data => {
  return sanitizeEntity(data, { model: strapi.getModel(model.uid) });
};

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
  const sanitize = createSanitizeFn(model);

  return {
    /**
     * Retrieve single type content
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      const { query } = ctx;
      const entity = await service.find(query);
      return sanitize(entity);
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
        entity = await service.createOrUpdate(data, { files, query });
      } else {
        entity = await service.createOrUpdate(body, { query });
      }

      return sanitize(entity);
    },

    async delete(ctx) {
      const entity = await service.delete(ctx.query);
      return sanitize(entity);
    },
  };
};

/**
 *
 * Returns a collection type controller to handle default core-api actions
 */
const createCollectionTypeController = ({ model, service }) => {
  const sanitize = createSanitizeFn(model);

  return {
    /**
     * Retrieve records.
     *
     * @return {Object|Array}
     */
    async find(ctx) {
      let entities;
      if (_.has(ctx.query, '_q')) {
        entities = await service.search(ctx.query);
      } else {
        entities = await service.find(ctx.query);
      }

      return sanitize(entities);
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
    async findOne(ctx) {
      const { query, params } = ctx;
      const entity = await service.findOne({ ...query, id: params.id });

      return sanitize(entity);
    },

    /**
     * Count records.
     *
     * @return {Number}
     */
    count(ctx) {
      if (_.has(ctx.query, '_q')) {
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

      return sanitize(entity);
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

      return sanitize(entity);
    },

    /**
     * Destroy a record.
     *
     * @return {Object}
     */
    async delete(ctx) {
      const entity = await service.delete({ id: ctx.params.id });
      return sanitize(entity);
    },
  };
};
