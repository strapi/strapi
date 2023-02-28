'use strict';

const { trim, has } = require('lodash/fp');
const {
  errors: { ApplicationError },
  stringEquals,
} = require('@strapi/utils');

const {
  token: { validateTransferTokenCreationInput, validateTransferTokenUpdateInput },
} = require('../../validation/transfer');
const { getService } = require('../../utils');

module.exports = {
  async list(ctx) {
    const transferService = getService('transfer');
    const transferTokens = await transferService.token.list();

    ctx.body = { data: transferTokens };
  },

  async getById(ctx) {
    const { id } = ctx.params;
    const tokenService = getService('transfer').token;

    const transferToken = await tokenService.getById(id);

    if (!transferToken) {
      ctx.notFound('Transfer token not found');
      return;
    }

    ctx.body = { data: transferToken };
  },

  async create(ctx) {
    const { body } = ctx.request;
    const { token: tokenService } = getService('transfer');

    /**
     * We trim fields to avoid having issues with either:
     * - having a space at the end or start of the value
     * - having only spaces as value (so that an empty field can be caught in validation)
     */
    const attributes = {
      name: trim(body.name),
      description: trim(body.description),
      permissions: body.permissions,
      lifespan: body.lifespan,
    };

    await validateTransferTokenCreationInput(attributes);

    const alreadyExists = await tokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const transferTokens = await tokenService.create(attributes);

    ctx.created({ data: transferTokens });
  },

  async update(ctx) {
    const { body } = ctx.request;
    const { id } = ctx.params;
    const { token: tokenService } = getService('transfer');

    const attributes = body;
    /**
     * We trim fields to avoid having issues with either:
     * - having a space at the end or start of the value
     * - having only spaces as value (so that an empty field can be caught in validation)
     */
    if (has('name', attributes)) {
      attributes.name = trim(body.name);
    }

    if (has('description', attributes) || attributes.description === null) {
      attributes.description = trim(body.description);
    }

    await validateTransferTokenUpdateInput(attributes);

    const apiTokenExists = await tokenService.getById(id);
    if (!apiTokenExists) {
      return ctx.notFound('Transfer token not found');
    }

    if (has('name', attributes)) {
      const nameAlreadyTaken = await tokenService.getByName(attributes.name);

      /**
       * We cast the ids as string as the one coming from the ctx isn't cast
       * as a Number in case it is supposed to be an integer. It remains
       * as a string. This way we avoid issues with integers in the db.
       */
      if (!!nameAlreadyTaken && !stringEquals(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const apiToken = await tokenService.update(id, attributes);

    ctx.body = { data: apiToken };
  },

  async revoke(ctx) {
    const { id } = ctx.params;
    const { token: tokenService } = getService('transfer');

    const transferToken = await tokenService.revoke(id);

    ctx.deleted({ data: transferToken });
  },

  async regenerate(ctx) {
    const { id } = ctx.params;
    const { token: tokenService } = getService('transfer');

    const exists = await tokenService.getById(id);
    if (!exists) {
      ctx.notFound('Transfer token not found');
      return;
    }

    const accessToken = await tokenService.regenerate(id);

    ctx.created({ data: accessToken });
  },
};
