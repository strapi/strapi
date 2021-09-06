'use strict';

const { trim } = require('lodash/fp');
const has = require('lodash/has');
const { getService } = require('../utils');
const {
  validateApiTokenCreationInput,
  validateApiTokenUpdateInput,
} = require('../validation/api-tokens');

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;
    const apiTokenService = getService('api-token');

    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    const attributes = {
      name: trim(body.name),
      description: trim(body.description),
      type: body.type,
    };

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

  async list(ctx) {
    const apiTokenService = getService('api-token');
    const apiTokens = await apiTokenService.list();

    ctx.send({ data: apiTokens });
  },

  async revoke(ctx) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token');
    const apiToken = await apiTokenService.revoke(id);

    ctx.deleted({ data: apiToken });
  },

  async get(ctx) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token');
    const apiToken = await apiTokenService.getById(id);

    if (!apiToken) {
      ctx.notFound('API Token not found');

      return;
    }

    ctx.send({ data: apiToken });
  },

  async update(ctx) {
    const { body } = ctx.request;
    const { id } = ctx.params;
    const apiTokenService = getService('api-token');

    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    const attributes = {
      name: trim(body.name),
      description: trim(body.description),
      type: body.type,
    };

    try {
      await validateApiTokenUpdateInput(attributes);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const apiTokenExists = await apiTokenService.getById(id);
    if (!apiTokenExists) {
      return ctx.notFound('API token not found');
    }

    if (has(attributes, 'name')) {
      const nameAlreadyTaken = await apiTokenService.exists({ name: attributes.name });
      if (nameAlreadyTaken) {
        return ctx.badRequest('Name already taken');
      }
    }

    const apiToken = await apiTokenService.update(id, attributes);
    ctx.send({ data: apiToken });
  },
};
