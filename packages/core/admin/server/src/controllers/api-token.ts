import type { Context } from 'koa';

import { strings, errors } from '@strapi/utils';
import { trim, has } from 'lodash/fp';
import { getService } from '../utils';
import {
  validateApiTokenCreationInput,
  validateApiTokenUpdateInput,
} from '../validation/api-tokens';

import { Create, List, Revoke, Get, Update } from '../../../shared/contracts/api-token';

const { ApplicationError } = errors;

export default {
  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const apiTokenService = getService('api-token-content-api');

    const attributes = {
      kind: 'content-api' as const,
      name: trim(body.name),
      description: trim(body.description),
      type: body.type,
      permissions: body.permissions,
      lifespan: body.lifespan,
    };

    await validateApiTokenCreationInput(attributes);

    const alreadyExists = await apiTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes, ctx.state.user);
    ctx.created({ data: apiToken } satisfies Create.Response);
  },

  // -------------------------------------------------------------------------
  // Regenerate
  // -------------------------------------------------------------------------
  async regenerate(ctx: Context) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token-content-api');

    const token = await apiTokenService.getById(id);
    if (!token) {
      ctx.notFound('API Token not found');
      return;
    }

    const accessToken = await apiTokenService.regenerate(id);
    ctx.created({ data: accessToken });
  },

  // -------------------------------------------------------------------------
  // List — always content-api
  // -------------------------------------------------------------------------
  async list(ctx: Context) {
    const apiTokenService = getService('api-token-content-api');
    const apiTokens = await apiTokenService.list(ctx.state.user);

    ctx.send({ data: apiTokens } satisfies List.Response);
  },

  // -------------------------------------------------------------------------
  // Revoke
  // -------------------------------------------------------------------------
  async revoke(ctx: Context) {
    const { id } = ctx.params as Revoke.Params;
    const apiTokenService = getService('api-token-content-api');
    const apiToken = await apiTokenService.revoke(id);

    ctx.deleted({ data: apiToken } satisfies Revoke.Response);
  },

  // -------------------------------------------------------------------------
  // Get — always expose the decrypted key (content-api back-compat)
  // -------------------------------------------------------------------------
  async get(ctx: Context) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token-content-api');

    const token = await apiTokenService.getById(id);
    if (!token) {
      ctx.notFound('API Token not found');
      return;
    }

    const withKey = await apiTokenService.getById(id, { includeDecryptedKey: true });
    ctx.send({ data: withKey ?? token } satisfies Get.Response);
  },

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  async update(ctx: Context) {
    const { body } = ctx.request as Update.Request;
    const { id } = ctx.params as Update.Params;
    const apiTokenService = getService('api-token-content-api');

    const mutableBody = body as Record<string, unknown>;
    if (has('name', mutableBody)) {
      mutableBody.name = trim(body.name ?? '');
    }
    if (has('description', mutableBody) || mutableBody.description === null) {
      mutableBody.description = trim(body.description ?? '');
    }

    await validateApiTokenUpdateInput(body);

    const existingToken = await apiTokenService.getById(id);
    if (!existingToken) {
      return ctx.notFound('API Token not found');
    }

    if (has('name', body)) {
      const nameAlreadyTaken = await apiTokenService.getByName(body.name!);
      if (nameAlreadyTaken !== null && !strings.isEqual(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const apiToken = await apiTokenService.update(id, body);
    ctx.send({ data: apiToken } satisfies Update.Response);
  },
};
