'use strict';

const { getService } = require('../utils');
const { validateApiTokenCreationInput } = require('../validation/api-tokens');

module.exports = {
  async create(ctx) {
    const { body: attributes } = ctx.request;
    const apiTokenService = getService('api-token');

    try {
      await validateApiTokenCreationInput(attributes);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    if (apiTokenService.exists({ name: attributes.name })) {
      return ctx.badRequest('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes);

    ctx.created({ data: apiToken });
  },
};
