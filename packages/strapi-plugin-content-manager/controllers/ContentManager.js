'use strict';

const _ = require('lodash');

module.exports = {
  /**
   * Returns a list of entities of a content-type matching the query parameters
   */
  async find(ctx) {
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    let entities = [];
    if (!_.isEmpty(ctx.request.query._q)) {
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
    if (!_.isEmpty(ctx.request.query._q)) {
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
    const { source } = ctx.request.query;
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    try {
      // Create an entry using `queries` system
      ctx.body = await contentManagerService.add(
        ctx.params,
        ctx.request.body,
        source
      );

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
    const { source } = ctx.request.query;
    const contentManagerService =
      strapi.plugins['content-manager'].services['contentmanager'];

    try {
      // Return the last one which is the current model.
      ctx.body = await contentManagerService.edit(
        ctx.params,
        ctx.request.body,
        source
      );
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
  delete() {},
  deleteMany() {},
};

module.exports = {
  models: async ctx => {
    const pluginsStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'content-manager',
    });

    const models = await pluginsStore.get({ key: 'schema' });

    ctx.body = {
      models,
    };
  },

  create: async ctx => {
    const { source } = ctx.request.query;

    try {
      // Create an entry using `queries` system
      ctx.body = await strapi.plugins['content-manager'].services[
        'contentmanager'
      ].add(ctx.params, ctx.request.body, source);

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

  update: async ctx => {
    const { source } = ctx.request.query;

    try {
      // Return the last one which is the current model.
      ctx.body = await strapi.plugins['content-manager'].services[
        'contentmanager'
      ].edit(ctx.params, ctx.request.body, source);
    } catch (error) {
      // TODO handle error update
      strapi.log.error(error);
      ctx.badRequest(
        null,
        ctx.request.admin
          ? [{ messages: [{ id: error.message, field: error.field }] }]
          : error.message
      );
    }
  },

  updateSettings: async ctx => {
    const { schema } = ctx.request.body;
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'content-manager',
    });
    await pluginStore.set({ key: 'schema', value: schema });

    return (ctx.body = { ok: true });
  },

  delete: async ctx => {
    ctx.body = await strapi.plugins['content-manager'].services[
      'contentmanager'
    ].delete(ctx.params, ctx.request.query);
  },

  deleteAll: async ctx => {
    ctx.body = await strapi.plugins['content-manager'].services[
      'contentmanager'
    ].deleteMany(ctx.params, ctx.request.query);
  },
};
