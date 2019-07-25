'use strict';

const { createModelConfigurationSchema } = require('./validation');

module.exports = {
  /**
   * Returns the list of available content types
   */
  listContentTypes(ctx) {
    const service = strapi.plugins['content-manager'].services.contenttypes;

    const userModels = Object.keys(strapi.models)
      .filter(key => key !== 'core_store')
      .map(uid => {
        return service.formatContentType(uid, strapi.models[uid]);
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
          return service.formatContentType(uid, plugin.models[uid], {
            uid,
            isDisplayed: shouldDisplayPluginModel(uid),
            source: pluginKey,
          });
        });
      })
      .reduce((acc, models) => acc.concat(models), []);

    const adminModels = Object.keys(strapi.admin.models).map(uid => {
      return service.formatContentType(uid, strapi.admin.models[uid], {
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
    const service = strapi.plugins['content-manager'].services.contenttypes;

    const contentType = service.findContentTypeModel({
      uid,
      source,
    });

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const contentTypeConfigurations = await service.getConfiguration({
      uid,
      source,
    });

    const data = {
      uid,
      source,
      schema: service.formatContentTypeSchema(contentType),
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
    const service = strapi.plugins['content-manager'].services.contenttypes;

    // try to find the model
    const contentType = service.findContentTypeModel({
      uid,
      source,
    });

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const schema = service.formatContentTypeSchema(contentType);

    let input;
    try {
      input = await createModelConfigurationSchema(
        contentType,
        schema
      ).validate(body, {
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

    await service.setConfiguration({ uid, source }, input);

    const contentTypeConfigurations = await service.getConfiguration({
      uid,
      source,
    });

    const data = {
      uid,
      source,
      schema,
      ...contentTypeConfigurations,
    };

    ctx.body = { data };
  },
};
