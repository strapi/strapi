'use strict';

const { generalSettingsSchema } = require('./validation');

module.exports = {
  /**
   * Returns the general content manager settings
   */
  async getGeneralSettings(ctx) {
    const service = strapi.plugins['content-manager'].services.generalsettings;

    const generalSettings = await service.getGeneralSettings();

    ctx.body = { data: generalSettings };
  },

  /**
   * Update the general content manager settings
   * and the content types settings imapcted by it
   */
  async updateGeneralSettings(ctx) {
    const { body = {} } = ctx.request;
    const service = strapi.plugins['content-manager'].services.generalsettings;

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

    await service.setGeneralSettings(data);

    ctx.body = { data };
  },
};
