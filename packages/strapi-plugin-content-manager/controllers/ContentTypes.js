'use strict';

const {
  generalSettingsSchema,
  createModelConfigurationSchema,
} = require('./validation');

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

  /**
   * Returns the list of available content types
   */
  listContentTypes(ctx) {
    const contentTypeService =
      strapi.plugins['content-manager'].services.contenttypes;

    const userModels = Object.keys(strapi.models)
      .filter(key => key !== 'core_store')
      .map(uid => {
        const { info } = strapi.models[uid];
        return contentTypeService.formatContentType({ uid, info });
      });

    const shouldDisplayPluginModel = uid => {
      if (['file', 'permission', 'role'].includes(uid)) {
        return false;
      }
      return true;
    };

    const pluginModels = Object.keys(strapi.plugins)
      .map(pluginKey => {
        const plugin = strapi.plugins[pluginKey];

        return Object.keys(plugin.models || {}).map(uid => {
          const { info } = plugin.models[uid];

          return contentTypeService.formatContentType({
            uid,
            info,
            isDisplayed: shouldDisplayPluginModel(uid),
            source: pluginKey,
          });
        });
      })
      .reduce((acc, models) => acc.concat(models), []);

    const adminModels = Object.keys(strapi.admin.models).map(uid => {
      const { info } = strapi.admin.models[uid];

      return contentTypeService.formatContentType({
        uid,
        info,
        isDisplayed: false,
        source: 'admin',
      });
    });

    ctx.body = { data: [...userModels, ...pluginModels, ...adminModels] };
  },

  /**
   * Returns a content type configuration.
   * It includes
   *  - schema
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async findContentType(ctx) {
    const { uid } = ctx.params;
    const { source } = ctx.query;
    const contentTypeService =
      strapi.plugins['content-manager'].services.contenttypes;

    const contentType = contentTypeService.findContentTypeModel({
      uid,
      source,
    });

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const contentTypeConfigurations = await contentTypeService.getContentTypeConfiguration(
      {
        uid,
        source,
      }
    );

    const data = {
      uid,
      source,
      schema: contentTypeService.formatContentTypeSchema(contentType),
      ...contentTypeConfigurations,
    };

    ctx.body = { data };
  },

  /**
   * Updates a content type configuration
   * You can only update the content-manager settings: (use the content-type-builder to update attributes)
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async updateContentType(ctx) {
    const { uid } = ctx.params;
    const { source } = ctx.query;
    const { body } = ctx.request;
    const contentTypeService =
      strapi.plugins['content-manager'].services.contenttypes;

    // try to find the model
    const contentType = contentTypeService.findContentTypeModel({
      uid,
      source,
    });

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    let input;
    try {
      input = await createModelConfigurationSchema(contentType).validate(body, {
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

    await contentTypeService.setContentTypeConfiguration(
      { uid, source },
      input
    );

    const contentTypeConfigurations = await contentTypeService.getContentTypeConfiguration(
      {
        uid,
        source,
      }
    );

    const data = {
      uid,
      source,
      schema: contentTypeService.formatContentTypeSchema(contentType),
      ...contentTypeConfigurations,
    };

    ctx.body = { data };
  },
};
