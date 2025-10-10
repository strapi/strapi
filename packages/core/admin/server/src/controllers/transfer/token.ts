import { Context } from 'koa';
import { trim, has } from 'lodash/fp';
import { errors, strings } from '@strapi/utils';
import { getService } from '../../utils';
import { token } from '../../validation/transfer';

import type {
  TokenCreate,
  TokenGetById,
  TokenList,
  TokenRegenerate,
  TokenRevoke,
  TokenUpdate,
} from '../../../../shared/contracts/transfer';

const { ApplicationError } = errors;

const { validateTransferTokenCreationInput, validateTransferTokenUpdateInput } = token;

export default {
  async list(ctx: Context) {
    const transferService = getService('transfer');
    const transferTokens = await transferService.token.list();

    ctx.body = { data: transferTokens } satisfies TokenList.Response;
  },

  async getById(ctx: Context) {
    const { id } = ctx.params as TokenGetById.Params;
    const tokenService = getService('transfer').token;

    const transferToken = await tokenService.getById(id);

    if (!transferToken) {
      ctx.notFound('Transfer token not found');
      return;
    }

    ctx.body = { data: transferToken } satisfies TokenGetById.Response;
  },

  async create(ctx: Context) {
    const { body } = ctx.request as TokenCreate.Request;
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

    ctx.created({ data: transferTokens } satisfies TokenCreate.Response);
  },

  async update(ctx: Context) {
    const { body } = ctx.request as TokenUpdate.Request;
    const { id } = ctx.params as TokenUpdate.Params;
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
      if (!!nameAlreadyTaken && !strings.isEqual(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const apiToken = await tokenService.update(id, attributes);

    ctx.body = { data: apiToken } satisfies TokenUpdate.Response;
  },

  async revoke(ctx: Context) {
    const { id } = ctx.params as TokenRevoke.Params;
    const { token: tokenService } = getService('transfer');

    const transferToken = await tokenService.revoke(id);

    ctx.deleted({ data: transferToken } satisfies TokenRevoke.Response);
  },

  async regenerate(ctx: Context) {
    const { id } = ctx.params as TokenRegenerate.Params;
    const { token: tokenService } = getService('transfer');

    const exists = await tokenService.getById(id);
    if (!exists) {
      ctx.notFound('Transfer token not found');
      return;
    }

    const accessToken = await tokenService.regenerate(id);

    ctx.created({ data: accessToken } satisfies TokenRegenerate.Response);
  },
};
