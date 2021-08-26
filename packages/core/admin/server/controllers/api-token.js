'use strict';

const pick = require('lodash/pick');

const { getService } = require('../utils');
const { validateApiTokenCreationInput } = require('../validation/api-tokens');

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;
    const apiTokenService = getService('api-token');

    try {
      await validateApiTokenCreationInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const attributes = pick(body, ['name', 'description', 'type']);

    if (apiTokenService.exists({ name: attributes.name })) {
      return ctx.badRequest('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes);

    ctx.created({ data: apiToken });
  },
};
