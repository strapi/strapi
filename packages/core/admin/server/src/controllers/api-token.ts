import type { Context } from 'koa';

import { strings, errors } from '@strapi/utils';
import { has } from 'lodash';

import { getService } from '../utils';
import { parseRouteId } from '../utils/route-id';
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
    const apiTokenService = getService('api-token-content-api');
    const { data: body, save } = await getService('form-extensions').internal_prepare(
      'content-api-token',
      { body: (ctx.request as Create.Request).body, user: ctx.state.user }
    );

    const attributes = {
      kind: 'content-api' as const,
      name: String(body.name ?? '').trim(),
      description: String(body.description ?? '').trim(),
      type: body.type,
      permissions: body.permissions,
      lifespan: body.lifespan,
    };

    await validateApiTokenCreationInput(attributes);

    const alreadyExists = await apiTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const apiToken = await save(
      () => apiTokenService.create(attributes, ctx.state.user),
      (created) => apiTokenService.revoke(created.id)
    );
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

    const token = await apiTokenService.getById(id, { includeDecryptedKey: true });
    if (!token) {
      ctx.notFound('API Token not found');
      return;
    }

    ctx.send({ data: token } satisfies Get.Response);
  },

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------
  async update(ctx: Context) {
    const id = parseRouteId((ctx.params as Update.Params).id);
    const apiTokenService = getService('api-token-content-api');

    if (id === null || !(await apiTokenService.getById(id))) {
      return ctx.notFound('API Token not found');
    }

    const { data: body, save } = await getService('form-extensions').internal_prepare(
      'content-api-token',
      { body: (ctx.request as Update.Request).body, user: ctx.state.user, entityId: id }
    );

    const mutableBody = body as Record<string, unknown>;
    if (has(mutableBody, 'name')) {
      mutableBody.name = String(body.name ?? '').trim();
    }
    if (has(mutableBody, 'description') || mutableBody.description === null) {
      mutableBody.description = String(body.description ?? '').trim();
    }

    await validateApiTokenUpdateInput(body);

    if (has(body, 'name')) {
      const nameAlreadyTaken = await apiTokenService.getByName(body.name!);
      if (nameAlreadyTaken !== null && !strings.isEqual(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    const apiToken = await save(() => apiTokenService.update(id, body));
    ctx.send({ data: apiToken } satisfies Update.Response);
  },
};
