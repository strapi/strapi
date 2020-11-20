'use strict';

const { getService } = require('../utils');
const { createModelConfigurationSchema, validateKind } = require('./validation');

module.exports = {
  async findContentTypes(ctx) {
    const { kind } = ctx.query;

    try {
      await validateKind(kind);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const contentTypes = getService('content-types').findContentTypesByKind(kind);
    const { toDto } = getService('data-mapper');

    ctx.body = { data: contentTypes.map(toDto) };
  },

  async findContentTypeConfiguration(ctx) {
    const { uid } = ctx.params;

    const contentTypeService = getService('content-types');

    const contentType = await contentTypeService.findContentType(uid);

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    const configuration = await contentTypeService.findConfiguration(contentType);
    const components = await contentTypeService.findComponentsConfigurations(contentType);

    ctx.body = {
      data: {
        contentType: configuration,
        components,
      },
    };
  },

  async updateContentTypeConfiguration(ctx) {
    const { userAbility } = ctx.state;
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const contentTypeService = getService('content-types');

    const contentType = await contentTypeService.findContentType(uid);

    if (!contentType) {
      return ctx.notFound('contentType.notFound');
    }

    if (!getService('permission').canConfigureContentType({ userAbility, contentType })) {
      return ctx.forbidden();
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

    const newConfiguration = await contentTypeService.updateConfiguration(contentType, input);

    ctx.body = { data: newConfiguration };
  },
};
