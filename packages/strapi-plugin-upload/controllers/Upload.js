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

    const files = await Service.getFiles(ctx.request.body.files);

    await Service.upload(files);

    // Send 200 `ok`
    ctx.send(files.map((file) => {
      return {
        url: `/${file.key}`
      };
    }));
  }
};
