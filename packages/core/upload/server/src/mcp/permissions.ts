import { errors } from '@strapi/utils';
import type { Modules } from '@strapi/types';

/**
 * Builds an admin permissions manager for a media model bound to the MCP session's ability.
 *
 * MCP tool handlers have no Koa context, so they cannot rely on route policies: each handler must
 * re-check permissions itself, exactly as the admin controllers do via `ctx.state.userAbility`.
 * The declarative `auth.policies` on a tool definition already gates registration and invocation;
 * this second check is what keeps a handler safe if it is ever called from another entry point.
 */
export const createMediaPermissionsManager = (
  context: Modules.MCP.McpHandlerContext,
  action: string,
  model: string
) =>
  strapi.service('admin::permission').createPermissionsManager({
    ability: context.userAbility,
    action,
    model,
  });

/**
 * Throws `ForbiddenError` unless the session's ability permits `action` on `model`.
 * Mirrors the `if (!pm.isAllowed) return ctx.forbidden()` guard in the admin controllers.
 */
export const assertMediaPermission = (
  context: Modules.MCP.McpHandlerContext,
  action: string,
  model: string
) => {
  const pm = createMediaPermissionsManager(context, action, model);

  if (!pm.isAllowed) {
    throw new errors.ForbiddenError();
  }

  return pm;
};
