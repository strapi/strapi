'use strict';

const _ = require('lodash');
const parseMultipartBody = require('../utils/parse-multipart');

module.exports = {
  /**
   * Returns a list of entities of a content-type matching the query parameters
   */
  async find(ctx) {
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    let entities = [];
    if (_.has(ctx.request.query, '_q')) {
      entities = await contentManagerService.search(
        ctx.params,
        ctx.request.query
      );
    } else {
      entities = await contentManagerService.fetchAll(
        ctx.params,
        ctx.request.query
      );
    }
    ctx.body = entities;
  },

  /**
   * Returns an entity of a content type by id
   */
  async findOne(ctx) {
    const { source } = ctx.request.query;
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    const entry = await contentManagerService.fetch(ctx.params, source);

    // Entry not found
    if (!entry) {
      return ctx.notFound('Entry not found');
    }

    ctx.body = entry;
  },

  /**
   * Returns a count of entities of a content type matching query parameters
   */
  async count(ctx) {
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    let count;
    if (_.has(ctx.request.query, '_q')) {
      count = await contentManagerService.countSearch(
        ctx.params,
        ctx.request.query
      );
    } else {
      count = await contentManagerService.count(ctx.params, ctx.request.query);
    }

    ctx.body = {
      count: _.isNumber(count) ? count : _.toNumber(count),
    };
  },

  /**
   * Creates an entity of a content type
   */
  async create(ctx) {
    const { model } = ctx.params;
    const { source } = ctx.request.query;

    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.body = await contentManagerService.create(data, {
          files,
          model,
          source,
        });
      } else {
        // Create an entry using `queries` system
        ctx.body = await contentManagerService.create(ctx.request.body, {
          source,
          model,
        });
      }

      strapi.emit('didCreateFirstContentTypeEntry', ctx.params, source);
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: error.message, field: error.field }] }]
          : error.message
      );
    }
  },

  /**
   * Updates an entity of a content type
   */
  async update(ctx) {
    const { model } = ctx.params;
    const { source } = ctx.request.query;
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.body = await contentManagerService.edit(ctx.params, data, {
          files,
          model,
          source,
        });
      } else {
        // Return the last one which is the current model.
        ctx.body = await contentManagerService.edit(
          ctx.params,
          ctx.request.body,
          { source, model }
        );
      }
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: error.message, field: error.field }] }]
          : error.message
      );
    }
  },

  /**
   * Deletes one entity of a content type matching a query
   */
  async delete(ctx) {
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    ctx.body = await contentManagerService.delete(
      ctx.params,
      ctx.request.query
    );
  },

  /**
   * Deletes multiple entities of a content type matching a query
   */
  async deleteMany(ctx) {
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    ctx.body = await contentManagerService.deleteMany(
      ctx.params,
      ctx.request.query
    );
  },
};
