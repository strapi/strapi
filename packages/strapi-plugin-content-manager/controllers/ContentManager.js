'use strict';

const _ = require('lodash');

const parseMultipartBody = require('../utils/parse-multipart');
const {
  validateGenerateUIDInput,
  validateCheckUIDAvailabilityInput,
  validateUIDField,
} = require('./validation');

module.exports = {
  async generateUID(ctx) {
    const { contentTypeUID, field, data } = await validateGenerateUIDInput(ctx.request.body);

    await validateUIDField(contentTypeUID, field);

    const uidService = strapi.plugins['content-manager'].services.uid;

    ctx.body = {
      data: await uidService.generateUIDField({ contentTypeUID, field, data }),
    };
  },

  async checkUIDAvailability(ctx) {
    const { contentTypeUID, field, value } = await validateCheckUIDAvailabilityInput(
      ctx.request.body
    );

    await validateUIDField(contentTypeUID, field);

    const uidService = strapi.plugins['content-manager'].services.uid;

    const isAvailable = await uidService.checkUIDAvailability({ contentTypeUID, field, value });

    ctx.body = {
      isAvailable,
      suggestion: !isAvailable
        ? await uidService.findUniqueUID({ contentTypeUID, field, value })
        : null,
    };
  },

  /**
   * Returns a list of entities of a content-type matching the query parameters
   */
  async find(ctx) {
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let entities = [];
    if (_.has(ctx.request.query, '_q')) {
      entities = await contentManagerService.search(ctx.params, ctx.request.query);
    } else {
      entities = await contentManagerService.fetchAll(ctx.params, ctx.request.query);
    }

    ctx.body = entities;
  },

  /**
   * Returns an entity of a content type by id
   */
  async findOne(ctx) {
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const entry = await contentManagerService.fetch(ctx.params);

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
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let count;
    if (_.has(ctx.request.query, '_q')) {
      count = await contentManagerService.countSearch(ctx.params, ctx.request.query);
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
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const { model } = ctx.params;

    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.body = await contentManagerService.create(data, {
          files,
          model,
        });
      } else {
        // Create an entry using `queries` system
        ctx.body = await contentManagerService.create(ctx.request.body, {
          model,
        });
      }

      strapi.emit('didCreateFirstContentTypeEntry', ctx.params);
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
        },
      ]);
    }
  },

  /**
   * Updates an entity of a content type
   */
  async update(ctx) {
    const { id, model } = ctx.params;

    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    try {
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartBody(ctx);
        ctx.body = await contentManagerService.edit({ id }, data, {
          files,
          model,
        });
      } else {
        // Return the last one which is the current model.
        ctx.body = await contentManagerService.edit({ id }, ctx.request.body, {
          model,
        });
      }
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
        },
      ]);
    }
  },

  /**
   * Deletes one entity of a content type matching a query
   */
  async delete(ctx) {
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    ctx.body = await contentManagerService.delete(ctx.params);
  },

  /**
   * Deletes multiple entities of a content type matching a query
   */
  async deleteMany(ctx) {
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    ctx.body = await contentManagerService.deleteMany(ctx.params, ctx.request.query);
  },
};
