import type { Context } from 'koa';

import { strings, errors } from '@strapi/utils';
import { trim, has } from 'lodash/fp';
import { getService } from '../utils';
import constants from '../services/constants';
import {
  validateAdminTokenCreationInput,
  validateAdminTokenUpdateInput,
} from '../validation/admin-tokens';
import {
  Create,
  List,
  Revoke,
  Get,
  Update,
  GetOwnerPermissions,
  AdminApiToken,
} from '../../../shared/contracts/admin-token';
import type { ContentApiApiToken } from '../../../shared/contracts/api-token';
import type { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError } = errors;

// ---------------------------------------------------------------------------
// Access-control helpers
// ---------------------------------------------------------------------------

const isSuperAdmin = (user: AdminUser): boolean =>
  user.roles.some((r) => r.code === constants.SUPER_ADMIN_CODE) === true;

const getOwnerId = (token: AdminApiToken): string => {
  const owner = token.adminUserOwner;
  return String(typeof owner === 'object' ? owner.id : owner);
};

/** Returns true when user is the recorded owner of an admin token. */
const isTokenOwner = (user: AdminUser, token: AdminApiToken): boolean =>
  getOwnerId(token) === String(user.id);

/** Owner OR super-admin can manage an admin token (read metadata, update…). */
const canAccessAdminToken = (user: AdminUser, token: AdminApiToken): boolean =>
  isTokenOwner(user, token) || isSuperAdmin(user);

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export default {
  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const apiTokenService = getService('api-token-admin');

    if ((body as ContentApiApiToken).type !== undefined) {
      return ctx.badRequest('Type is not allowed for admin tokens');
    }
    if ((body as ContentApiApiToken).permissions !== undefined) {
      return ctx.badRequest('Permissions are not allowed for admin tokens');
    }

    const attributes = {
      kind: 'admin' as const,
      name: trim(body.name),
      description: trim(body.description),
      adminPermissions: body.adminPermissions,
      lifespan: body.lifespan,
      adminUserOwner: ctx.state.user.id,
    };

    await validateAdminTokenCreationInput(attributes);

    const alreadyExists = await apiTokenService.exists({ name: attributes.name });
    if (alreadyExists) {
      throw new ApplicationError('Name already taken');
    }

    const apiToken = await apiTokenService.create(attributes, ctx.state.user);
    ctx.created({ data: apiToken });
  },

  // -------------------------------------------------------------------------
  // Regenerate — owner-only, super-admin does NOT bypass
  // -------------------------------------------------------------------------
  async regenerate(ctx: Context) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token-admin');

    const token = await apiTokenService.getById(id);
    if (!token) {
      ctx.notFound('API Token not found');
      return;
    }

    if (!isTokenOwner(ctx.state.user, token)) {
      return ctx.forbidden();
    }

    const accessToken = await apiTokenService.regenerate(id);
    ctx.created({ data: accessToken });
  },

  // -------------------------------------------------------------------------
  // List — always filtered to kind: 'admin'
  // -------------------------------------------------------------------------
  async list(ctx: Context) {
    const apiTokenService = getService('api-token-admin');
    const apiTokens = await apiTokenService.list(ctx.state.user);

    ctx.send({ data: apiTokens } satisfies List.Response);
  },

  // -------------------------------------------------------------------------
  // Revoke
  // -------------------------------------------------------------------------
  async revoke(ctx: Context) {
    const { id } = ctx.params as Revoke.Params;
    const apiTokenService = getService('api-token-admin');
    const apiToken = await apiTokenService.revoke(id);

    ctx.deleted({ data: apiToken } satisfies Revoke.Response);
  },

  // -------------------------------------------------------------------------
  // Get — key exposed only to owner
  // -------------------------------------------------------------------------
  async get(ctx: Context) {
    const { id } = ctx.params;
    const apiTokenService = getService('api-token-admin');

    const token = await apiTokenService.getById(id);
    if (!token) {
      ctx.notFound('API Token not found');
      return;
    }

    if (isTokenOwner(ctx.state.user, token)) {
      const withKey = await apiTokenService.getById(id, { includeDecryptedKey: true });
      ctx.send({ data: withKey ?? token } satisfies Get.Response);
      return;
    }

    ctx.send({ data: token } satisfies Get.Response);
  },

  // -------------------------------------------------------------------------
  // Update — owner or super-admin only
  // -------------------------------------------------------------------------
  async update(ctx: Context) {
    const { body } = ctx.request as Update.Request;
    const { id } = ctx.params as Update.Params;
    const apiTokenService = getService('api-token-admin');

    const mutableBody = body as Record<string, unknown>;
    if (has('name', mutableBody)) {
      mutableBody.name = trim(body.name ?? '');
    }
    if (has('description', mutableBody) || mutableBody.description === null) {
      mutableBody.description = trim(body.description ?? '');
    }

    await validateAdminTokenUpdateInput(body);

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

    if (!canAccessAdminToken(ctx.state.user, existingToken)) {
      return ctx.forbidden();
    }

    const apiToken = await apiTokenService.update(id, body);
    ctx.send({ data: apiToken } satisfies Update.Response);
  },

  // -------------------------------------------------------------------------
  // Owner permissions — effective permissions of the token owner
  // -------------------------------------------------------------------------
  async getOwnerPermissions(ctx: Context) {
    const { id } = ctx.params as GetOwnerPermissions.Request['params'];
    const apiTokenService = getService('api-token-admin');
    const permissionService = getService('permission');
    const userService = getService('user');

    const token = await apiTokenService.getById(id);
    if (!token) {
      return ctx.notFound('apiToken.notFound');
    }

    if (!canAccessAdminToken(ctx.state.user, token)) {
      return ctx.forbidden();
    }

    const ownerId = getOwnerId(token);
    const ownerUser = await userService.findOne(ownerId);
    if (!ownerUser) {
      return ctx.notFound('owner.notFound');
    }

    const ownerPermissions = await permissionService.findUserPermissions(ownerUser);
    const sanitizedPermissions = ownerPermissions.map(permissionService.sanitizePermission);

    // @ts-expect-error - transform response type to sanitized permission
    ctx.body = { data: sanitizedPermissions } satisfies GetOwnerPermissions.Response;
  },
};
