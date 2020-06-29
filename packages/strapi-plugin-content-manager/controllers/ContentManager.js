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
    const { model } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let entities = [];
    if (_.has(ctx.request.query, '_q')) {
      entities = await contentManagerService.search({ model }, ctx.request.query);
    } else {
      entities = await contentManagerService.fetchAll({ model }, ctx.request.query);
    }

    if (!entities) {
      return ctx.notFound();
    }

    ctx.body = entities;
  },

  /**
   * Returns an entity of a content type by id
   */
  async findOne(ctx) {
    const { model, id } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const entry = await contentManagerService.fetch({ model, id });

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
    const { model } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    let count;
    if (_.has(ctx.request.query, '_q')) {
      count = await contentManagerService.countSearch({ model }, ctx.request.query);
    } else {
      count = await contentManagerService.count({ model }, ctx.request.query);
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
    const { body } = ctx.request;

    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const userId = ctx.state.user.id;
    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      data.created_by = userId;
      data.updated_by = userId;
      ctx.body = await contentManagerService.create({ data, files }, { model });

      await strapi.telemetry.send('didCreateFirstContentTypeEntry', { model });
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
          errors: _.get(error, 'data.errors'),
        },
      ]);
    }
  },

  /**
   * Updates an entity of a content type
   */
  async update(ctx) {
    const { id, model } = ctx.params;
    const { body } = ctx.request;

    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    const userId = ctx.state.user.id;
    const { data, files } = ctx.is('multipart') ? parseMultipartBody(ctx) : { data: body };

    try {
      data.updated_by = userId;
      ctx.body = await contentManagerService.edit({ id }, { data, files }, { model });
    } catch (error) {
      strapi.log.error(error);
      ctx.badRequest(null, [
        {
          messages: [{ id: error.message, message: error.message, field: error.field }],
          errors: _.get(error, 'data.errors'),
        },
      ]);
    }
  },

  /**
   * Deletes one entity of a content type matching a query
   */
  async delete(ctx) {
    const { id, model } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    ctx.body = await contentManagerService.delete({ id, model });
  },

  /**
   * Deletes multiple entities of a content type matching a query
   */
  async deleteMany(ctx) {
    const { model } = ctx.params;
    const contentManagerService = strapi.plugins['content-manager'].services.contentmanager;

    ctx.body = await contentManagerService.deleteMany({ model }, ctx.request.query);
  },
};
