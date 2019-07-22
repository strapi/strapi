'use strict';

const { generalSettingsSchema } = require('./validation');

module.exports = {
  /**
   * Returns the general content manager settings
   */
  async getGeneralSettings(ctx) {
    const contentTypeService =
      strapi.plugins['content-manager'].services.contenttypes;

    const generalSettings = await contentTypeService.getGeneralSettings();

    ctx.body = { data: generalSettings };
  },

  /**
   * Update the general content manager settings
   * and the content types settings imapcted by it
   */
  async updateGeneralSettings(ctx) {
    const { body = {} } = ctx.request;
    const contentTypeService =
      strapi.plugins['content-manager'].services.contenttypes;

    let data;
    try {
      data = await generalSettingsSchema.validate(body, {
        abortEarly: false,
        stripUnknown: true,
        strict: true,
      });
    } catch (error) {
      return ctx.badRequest(null, {
        name: 'validationError',
        errors: error.errors,
      });
    }

    await contentTypeService.setGeneralSettings(data);

    ctx.body = { data };
  },
};
