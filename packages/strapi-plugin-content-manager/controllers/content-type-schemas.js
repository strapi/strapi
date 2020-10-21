'use strict';

const { createModelConfigurationSchema, validateKind } = require('./validation');

module.exports = {
  /**
   * Returns the list of available content types
   */
  async listContentTypes(ctx) {
    const { kind = 'collectionType' } = ctx.query;

    try {
      await validateKind(kind);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const { getContentTypesByKind } = strapi.plugins['content-manager'].services['content-types'];

    ctx.body = {
      data: getContentTypesByKind(kind),
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

    const service = strapi.plugins['content-manager'].services['content-types'];
    const componentService = strapi.plugins['content-manager'].services.components;

    const contentTypeConfigurations = await service.getConfiguration(uid);

    const data = {
      contentType: {
        uid,
        apiID: contentType.modelName,
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
    const { userAbility } = ctx.state;
    const { uid } = ctx.params;
    const { body } = ctx.request;

    // try to find the model
    const contentType = strapi.contentTypes[uid];

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const { canConfigure } = strapi.plugins['content-manager'].services.permission;

    if (!canConfigure(userAbility, contentType)) {
      throw strapi.errors.forbidden();
    }

    const service = strapi.plugins['content-manager'].services['content-types'];

    const schema = service.formatContentTypeSchema(contentType);

    let input;
    try {
      input = await createModelConfigurationSchema(contentType, schema).validate(body, {
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

    await service.setConfiguration(uid, input);
    const contentTypeConfigurations = await service.getConfiguration(uid);

    const data = {
      uid,
      schema,
      ...contentTypeConfigurations,
    };

    ctx.body = { data };
  },
};
