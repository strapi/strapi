'use strict';

/**
 * Upload.js controller
 *
 * @description: A set of functions called "actions" of the `upload` plugin.
 */

const _ = require('lodash');

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  index: async (ctx) => {
    const config = await strapi.store({
      environment: strapi.config.environment,
      type: 'plugin',
      name: 'upload'
    }).get({key: 'provider'});

    if (!config.enabled) {
      return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Upload.status.disabled' }] }] : 'Upload is disabled!');
    }

    const Service = strapi.plugins['upload'].services.upload;

    const files = await Service.bufferize(ctx.request.body.files);

    for (var i = 0; i < files.length; i++) {
      if (files[i].size > config.sizeLimit) {
        return ctx.badRequest(null, ctx.request.admin ? [{ messages: [{ id: 'Upload.status.sizeLimit' }] }] : 'One of file is bigger than limit size!');
      }
    }

    await Service.upload(files, config);

    // Send 200 `ok`
    ctx.send(files.map((file) => {
      delete file.buffer;

      if (_.startsWith(file.url, '/')) {
        file.url = strapi.config.url + file.url;
      }

      // Static data
      file.updatedAt = new Date();
      file.relatedTo = 'John Doe';

      return file;
    }));
  },

  getSettings: async (ctx) => {
    const config = await strapi.store({
      environment: ctx.params.environment,
      type: 'plugin',
      name: 'upload'
    }).get({key: 'provider'});

    ctx.send({
      providers: strapi.plugins.upload.config.providers,
      config
    });
  },

  updateSettings: async (ctx) => {
    await strapi.store({
      environment: ctx.params.environment,
      type: 'plugin',
      name: 'upload'
    }).set({key: 'provider', value: ctx.request.body});

    ctx.send({ok: true});
  },

  find: async (ctx) => {
    const data = await strapi.plugins['upload'].services.upload.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data.map((file) => {
      if (_.startsWith(file.url, '/')) {
        file.url = strapi.config.url + file.url;
      }

      return file;
    }));
  },

  count: async (ctx, next) => {
    const data = await strapi.plugins['upload'].services.upload.count(ctx.query);

    // Send 200 `ok`
    ctx.send({
      count: data
    });
  },

  destroy: async (ctx, next) => {
    const config = await strapi.store({
      environment: strapi.config.environment,
      type: 'plugin',
      name: 'upload'
    }).get({key: 'provider'});

    const data = await strapi.plugins['upload'].services.upload.remove(ctx.params, config);

    // Send 200 `ok`
    ctx.send(data);
  }
};
