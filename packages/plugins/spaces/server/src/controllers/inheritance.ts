import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { getService } from '../utils';
import { getRequestSpace } from '../utils/space-scope';
import { isSpaceScopedContentType } from '../services/content-types';

const { ValidationError } = errors;

const MAX_DOCUMENT_IDS = 200;

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string' && value.length > 0) {
    return value.split(',');
  }
  return [];
};

/**
 * The content type must exist, be workspace-scoped, and the caller must hold
 * the Content Manager permission named — overriding and resetting write the
 * workspace's own content, so they are gated like any other write on it.
 */
const check = (strapi: Core.Strapi, ctx: any, action: string) => {
  const uid = (ctx.request?.body?.uid ?? ctx.query?.contentType) as string | undefined;
  if (!uid) {
    throw new ValidationError('uid is required');
  }

  const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
  if (!contentType || !isSpaceScopedContentType(contentType)) {
    ctx.notFound('Unknown or unscoped content type');
    return undefined;
  }

  const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
    ability: ctx.state.userAbility,
    action,
    model: uid,
  });
  if (!permissionsManager.isAllowed) {
    ctx.forbidden();
    return undefined;
  }

  return uid;
};

const requireSubWorkspace = (strapi: Core.Strapi, ctx: any) => {
  const request = getRequestSpace(strapi);
  if (!request || request.isDefault) {
    ctx.badRequest('Switch to the workspace that should own the copy');
    return undefined;
  }
  return request;
};

const inheritanceController = ({ strapi }: { strapi: Core.Strapi }) => ({
  /** POST /spaces/inheritance/override — take a local copy of an inherited entry. */
  async override(ctx: any) {
    const uid = check(strapi, ctx, 'plugin::content-manager.explorer.update');
    if (!uid) return;
    const request = requireSubWorkspace(strapi, ctx);
    if (!request) return;

    const documentId = ctx.request?.body?.documentId;
    if (typeof documentId !== 'string' || documentId.length === 0) {
      throw new ValidationError('documentId is required');
    }

    ctx.body = { data: await getService('inheritance').override(uid, documentId, request.id) };
  },

  /** POST /spaces/inheritance/reset — drop the copy, follow the original again. */
  async reset(ctx: any) {
    const uid = check(strapi, ctx, 'plugin::content-manager.explorer.delete');
    if (!uid) return;
    const request = requireSubWorkspace(strapi, ctx);
    if (!request) return;

    const documentId = ctx.request?.body?.documentId;
    if (typeof documentId !== 'string' || documentId.length === 0) {
      throw new ValidationError('documentId is required');
    }

    ctx.body = { data: await getService('inheritance').reset(uid, documentId, request.id) };
  },

  /**
   * GET /spaces/inheritance?contentType=&documentIds=a,b,c — for each inherited
   * document, which workspaces read it as it is and which have their own copy.
   */
  async summary(ctx: any) {
    const uid = check(strapi, ctx, 'plugin::content-manager.explorer.read');
    if (!uid) return;

    const documentIds = toList(ctx.query?.documentIds).slice(0, MAX_DOCUMENT_IDS);
    ctx.body = { data: await getService('inheritance').summarize(uid, documentIds) };
  },
});

export default inheritanceController;
