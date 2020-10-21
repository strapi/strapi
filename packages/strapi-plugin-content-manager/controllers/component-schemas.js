'use strict';

const { createModelConfigurationSchema } = require('./validation');

module.exports = {
  /**
   * Returns the list of available components
   */
  async listComponents(ctx) {
    const contentTypeService = strapi.plugins['content-manager'].services['content-types'];

    const data = Object.keys(strapi.components).map(uid => {
      return {
        category: strapi.components[uid].category,
        ...contentTypeService.formatContentType(strapi.components[uid]),
      };
    });

    ctx.body = { data };
  },

  /**
   * Returns a component configuration.
   * It includes
   *  - schema
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async findComponent(ctx) {
    const { uid } = ctx.params;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.notFound('component.notFound');
    }

    const componentService = strapi.plugins['content-manager'].services.components;

    const data = await componentService.getComponentInformations(uid);

    ctx.body = { data };
  },

  /**
   * Updates a component configuration
   * You can only update the content-manager settings: (use the content-type-builder to update attributes)
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  async updateComponent(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.notFound('component.notFound');
    }

    const componentService = strapi.plugins['content-manager'].services.components;
    const contentTypeService = strapi.plugins['content-manager'].services['content-types'];

    const schema = contentTypeService.formatContentTypeSchema(component);
    let input;
    try {
      input = await createModelConfigurationSchema(component, schema).validate(body, {
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

    await componentService.setConfiguration(uid, input);

    const configurations = await componentService.getConfiguration(uid);

    const data = {
      uid,
      schema,
      ...configurations,
    };

    ctx.body = { data };
  },
};
