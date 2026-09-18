import { errors } from '@strapi/utils';
import type { Core, Modules } from '@strapi/types';

/**
 * Builds an admin permissions manager for a media model bound to the MCP session's ability.
 *
 * MCP tool handlers have no Koa context, so they cannot rely on route policies: each handler must
 * re-check permissions itself, exactly as the admin controllers do via `ctx.state.userAbility`.
 * The declarative `auth.policies` on a tool definition already gates registration and invocation;
 * this second check is what keeps a handler safe if it is ever called from another entry point.
 *
 * It is also the only check bound to a model. `plugin::upload.read` is registered in the
 * `plugins` section with no subject (see the upload plugin bootstrap), so a tool's policies
 * carry an action only — a subject-less grant registers as CASL `subject: 'all'`. Passing a
 * model UID as the policy subject is rejected by the admin-token validation, so the file /
 * folder distinction is enforced here, where the permissions manager is bound to the UID.
 */
export const createMediaPermissionsManager = (
  strapi: Core.Strapi,
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
  strapi: Core.Strapi,
  context: Modules.MCP.McpHandlerContext,
  action: string,
  model: string
) => {
  const pm = createMediaPermissionsManager(strapi, context, action, model);

  if (!pm.isAllowed) {
    throw new errors.ForbiddenError();
  }

  return pm;
};
