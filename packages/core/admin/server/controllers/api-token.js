'use strict';

const { trim } = require('lodash/fp');
const { getService } = require('../utils');
const { validateApiTokenCreationInput } = require('../validation/api-tokens');

module.exports = {
  async create(ctx) {
    const { body: attributes } = ctx.request;
    const apiTokenService = getService('api-token');

    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    attributes.name = trim(attributes.name);
    attributes.description = trim(attributes.description);

    try {
      await validateApiTokenCreationInput(attributes);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const alreadyExists = await apiTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      return ctx.badRequest('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes);
    ctx.created({ data: apiToken });
  },
};
