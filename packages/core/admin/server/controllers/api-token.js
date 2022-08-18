'use strict';

const { stringEquals } = require('@strapi/utils/lib');
const { ApplicationError } = require('@strapi/utils').errors;
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
      permissions: body.permissions,
    };

    await validateApiTokenCreationInput(attributes);

    const alreadyExists = await apiTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes);
    ctx.created({ data: apiToken });
  },

  async regenerate(ctx) {
    const { body } = ctx.request;
    const apiTokenService = getService('api-token');

    const alreadyExists = await apiTokenService.exists({ name: body.id });
    if (!alreadyExists) {
      ctx.notFound('API Token not found');
      return;
    }

    const accessToken = await apiTokenService.regenerate(body.id);
    ctx.created({ data: accessToken });
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

    const attributes = body;
    /**
     * We trim both field to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    if (has(attributes, 'name')) {
      attributes.name = trim(body.name);
    }

    if (has(attributes, 'description') || attributes.description === null) {
      attributes.description = trim(body.description);
    }

    // Don't allow updating lastUsed time
    if (has(attributes, 'lastUsed')) {
      throw new ApplicationError('lastUsed cannot be updated');
    }

    await validateApiTokenUpdateInput(attributes);

    const apiTokenExists = await apiTokenService.getById(id);
    if (!apiTokenExists) {
      return ctx.notFound('API Token not found');
    }

    if (has(attributes, 'name')) {
      const nameAlreadyTaken = await apiTokenService.getByName(attributes.name);

      /**
       * We cast the ids as string as the one coming from the ctx isn't cast
       * as a Number in case it is supposed to be an integer. It remains
       * as a string. This way we avoid issues with integers in the db.
       */
      if (!!nameAlreadyTaken && !stringEquals(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const apiToken = await apiTokenService.update(id, attributes);
    ctx.send({ data: apiToken });
  },
};
