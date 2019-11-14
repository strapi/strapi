'use strict';

const { createModelConfigurationSchema } = require('./validation');
const service = require('../services/ContentTypes');
const componentService = require('../services/Components');

module.exports = {
  /**
   * Returns the list of available content types
   */
  listContentTypes(ctx) {
    const contentTypes = Object.keys(strapi.contentTypes).map(uid => {
      return service.formatContentType(strapi.contentTypes[uid]);
    });

    ctx.body = {
      data: contentTypes,
    };
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

    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const contentTypeConfigurations = await service.getConfiguration(
      contentType
    );

    const data = {
      contentType: {
        uid,
        schema: service.formatContentTypeSchema(contentType),
        ...contentTypeConfigurations,
      },
      components: await componentService.getComponentsSchemas(contentType),
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
    const { body } = ctx.request;

    // try to find the model
    const contentType = strapi.contentTypes[uid];

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

    await service.setConfiguration(contentType, input);

    const contentTypeConfigurations = await service.getConfiguration(
      contentType
    );

    const data = {
      uid,
      schema,
      ...contentTypeConfigurations,
    };

    ctx.body = { data };
  },
};
