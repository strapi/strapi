'use strict';

/**
 * Upload.js controller
 *
 * @description: A set of functions called "actions" of the `upload` plugin.
 */

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */

  index: async (ctx) => {
    const Service = strapi.plugins['upload'].services.upload;

    const files = await Service.buffurize(ctx.request.body.files);

    await Service.upload(files);

    // Send 200 `ok`
    ctx.send(files.map((file) => {
      delete file.buffer;
      file.url = `${strapi.config.url}/uploads/${file.hash}.${file.ext}`;

      // Static data
      file.updatedAt = new Date();
      file.relatedTo = 'John Doe';

      return file;
    }));
  },

  find: async (ctx) => {
    const data = await strapi.plugins['upload'].services.upload.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data.map((file) => {
      file.url = `${strapi.config.url}${file.url}`;
      return file;
    }));
  },

  destroy: async (ctx, next) => {
    const data = await strapi.plugins['upload'].services.upload.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  }
};
