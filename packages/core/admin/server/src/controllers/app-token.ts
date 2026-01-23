import type { Context } from 'koa';
import { strings, errors } from '@strapi/utils';
import { trim, has, isEmpty } from 'lodash/fp';
import { getService } from '../utils';
import {
  validateAppTokenCreationInput,
  validateAppTokenUpdateInput,
} from '../validation/app-tokens';
import constants from '../services/constants';

import type {
  Create,
  List,
  Revoke,
  Get,
  Update,
  Regenerate,
  GetPermissions,
  UpdatePermissions,
} from '../../../shared/contracts/app-token';

const { ApplicationError } = errors;

export default {
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    /**
     * We trim both fields to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    const inputData = {
      name: trim(body.name),
      description: body.description ? trim(body.description) : '',
      permissions: body.permissions,
      lifespan: body.lifespan,
    };

    await validateAppTokenCreationInput(inputData, ctx.state.user);

    const attributes = {
      ...inputData,
      userId,
    };

    const alreadyExists = await appTokenService.exists({ name: attributes.name, userId });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    // Type inference: permissions.length === 0 ? 'inherit' : 'custom'
    const type =
      isEmpty(attributes.permissions) || attributes.permissions?.length === 0
        ? constants.APP_TOKEN_TYPE.INHERIT
        : constants.APP_TOKEN_TYPE.CUSTOM;

    const appToken = await appTokenService.create({ ...attributes, type });

    // Token value (accessKey) is returned ONLY on create/regenerate
    ctx.created({ data: appToken } satisfies Create.Response);
  },

  async regenerate(ctx: Context) {
    const { id } = ctx.params as Regenerate.Params;
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    // Verify ownership before regenerating
    const existingToken = await appTokenService.getBy({ id, userId });
    if (existingToken === null) {
      return ctx.notFound('App Token not found');
    }

    const appToken = await appTokenService.regenerate(id);

    // Token value shown ONLY this once
    ctx.created({ data: appToken } satisfies Regenerate.Response);
  },

  async list(ctx: Context) {
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    // List only user's own tokens
    const appTokens = await appTokenService.list(userId);

    // Remove accessKey from list response
    const tokensWithoutKey = appTokens.map(({ accessKey, ...token }) => token);

    ctx.send({ data: tokensWithoutKey } satisfies List.Response);
  },

  async revoke(ctx: Context) {
    const { id } = ctx.params as Revoke.Params;
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    // Verify ownership before revoking
    const existingToken = await appTokenService.getBy({ id, userId });
    if (existingToken === null) {
      return ctx.notFound('App Token not found');
    }

    const appToken = await appTokenService.revoke(id);

    ctx.deleted({ data: appToken } satisfies Revoke.Response);
  },

  async get(ctx: Context) {
    const { id } = ctx.params as Get.Params;
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    const appToken = await appTokenService.getBy({ id, userId });

    if (appToken === null) {
      return ctx.notFound('App Token not found');
    }

    // NEVER return accessKey on GET - only on create/regenerate
    const { accessKey, ...tokenWithoutKey } = appToken;

    ctx.send({ data: tokenWithoutKey } satisfies Get.Response);
  },

  async update(ctx: Context) {
    const { body } = ctx.request as Update.Request;
    const { id } = ctx.params as Update.Params;
    const appTokenService = getService('app-token');
    const userId = ctx.state.user.id;

    const attributes = body;

    /**
     * We trim both fields to avoid having issues with either:
     * - having a space at the end or start of the value.
     * - having only spaces as value;
     */
    if (has('name', attributes)) {
      attributes.name = trim(body.name);
    }

    if (has('description', attributes) || attributes.description === null) {
      attributes.description = body.description ? trim(body.description) : '';
    }

    await validateAppTokenUpdateInput(attributes, ctx.state.user);

    // Verify ownership before updating
    const appTokenExists = await appTokenService.getBy({ id, userId });
    if (appTokenExists === null) {
      return ctx.notFound('App Token not found');
    }

    if (has('name', attributes)) {
      const nameAlreadyTaken = await appTokenService.getBy({ name: attributes.name, userId });

      /**
       * We cast the ids as string as the one coming from the ctx isn't cast
       * as a Number in case it is supposed to be an integer. It remains
       * as a string. This way we avoid issues with integers in the db.
       */
      if (nameAlreadyTaken !== null && !strings.isEqual(nameAlreadyTaken.id, id)) {
        throw new ApplicationError('Name already taken');
      }
    }

    // Type inference: permissions.length === 0 ? 'inherit' : 'custom'
    const type =
      isEmpty(attributes.permissions) || attributes.permissions?.length === 0
        ? constants.APP_TOKEN_TYPE.INHERIT
        : constants.APP_TOKEN_TYPE.CUSTOM;

    const appToken = await appTokenService.update(id, { ...attributes, type });

    // Remove accessKey from update response
    const { accessKey, ...tokenWithoutKey } = appToken;

    ctx.send({ data: tokenWithoutKey } satisfies Update.Response);
  },

  async getPermissions(ctx: Context) {
    const { id } = ctx.params as GetPermissions.Request['params'];
    const appTokenService = getService('app-token');
    const permissionService = getService('permission');
    const userId = ctx.state.user.id;

    // Verify token exists and belongs to user
    const token = await appTokenService.getBy({ id, userId });

    if (token === null) {
      return ctx.notFound('App Token not found');
    }

    // Query permissions directly from admin::permission
    const permissions = await permissionService.findMany({
      where: { token: { id: token.id } },
    });

    ctx.body = {
      data: permissions,
    } satisfies GetPermissions.Response;
  },

  async updatePermissions(ctx: Context) {
    const { id } = ctx.params as UpdatePermissions.Request['params'];
    const { body: input } = ctx.request as Omit<UpdatePermissions.Request, 'params'>;
    const appTokenService = getService('app-token');
    const permissionService = getService('permission');
    const userId = ctx.state.user.id;

    // Verify token exists and belongs to user
    const token = await appTokenService.getBy({ id, userId });

    if (token === null) {
      return ctx.notFound('App Token not found');
    }

    // Validate permissions
    await validateAppTokenUpdateInput({ permissions: input.permissions }, ctx.state.user);

    // Use assignPermissions from app-token service
    const type =
      isEmpty(input.permissions) || input.permissions.length === 0
        ? constants.APP_TOKEN_TYPE.INHERIT
        : constants.APP_TOKEN_TYPE.CUSTOM;

    await appTokenService.assignPermissions(id, input.permissions, type);

    // Fetch updated permissions
    const permissions = await permissionService.findMany({
      where: { token: { id: token.id } },
    });

    ctx.body = {
      data: permissions,
    } satisfies UpdatePermissions.Response;
  },
};
