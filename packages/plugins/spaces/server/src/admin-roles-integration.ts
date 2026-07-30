import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import { visibilityFilter, wrapControllerForVisibility } from './settings-visibility';

const ADMIN_ROLE_UID = 'admin::role';
const ADMIN_USER_UID = 'admin::user';

const ROLES_LIST_RE = /^\/admin\/roles\/?$/;
const ROLE_DETAIL_RE = /^\/admin\/roles\/(\d+)\/?$/;
const USERS_LIST_RE = /^\/admin\/users\/?$/;
const USER_DETAIL_RE = /^\/admin\/users\/(\d+)\/?$/;

/**
 * Spaces × admin roles. Roles are workspace-bound resources managed from the
 * `default` workspace:
 *
 *   - **Default workspace** — sees every role; the role edit form gets an
 *     "Available in workspaces" field (admin-side extension) whose `spaces`
 *     body field is consumed here by `wrapControllerForVisibility`.
 *   - **Other workspaces** — the roles list only shows roles bound to that
 *     workspace (or platform-wide ones), direct detail/write access to any
 *     other role is a 404, and a role created there is bound to it
 *     automatically. The association itself is only editable from default.
 *
 * Users follow their roles: outside the default workspace, the users list only
 * shows users holding at least one role visible in the active workspace, and
 * direct access to any other user is a 404. (List pagination totals still
 * count the unfiltered set — accepted until a proper query-level filter.)
 *
 * Headerless callers (CLI, provisioning scripts) stay unscoped.
 *
 * NOTE: this scopes role *management*. Filtering which workspaces a USER can
 * enter based on their roles' bindings is the next slice.
 */
export const patchAdminRolesForSpaces = (strapi: Core.Strapi) => {
  const visibleRoleIds = async (spaceSlug: string): Promise<Set<number>> => {
    const rows = await strapi.db.query(ADMIN_ROLE_UID).findMany({
      where: visibilityFilter(spaceSlug),
      select: ['id'],
    });
    return new Set(rows.map((r: { id: number }) => r.id));
  };

  // Read scoping + write guard. Registered BEFORE the controller wrapper below
  // so the auto-binding body injection happens before the wrapper extracts it.
  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug) {
      return next();
    }

    const isDefault = spaceSlug === DEFAULT_SPACE_SLUG;
    const detailMatch = ctx.path.match(ROLE_DETAIL_RE);

    /* ---- Before the controller ---- */

    if (!isDefault) {
      // A role created from a workspace belongs to it (unless the caller was explicit).
      if (ctx.method === 'POST' && ROLES_LIST_RE.test(ctx.path)) {
        const body = ctx.request?.body ?? {};
        if (body.spaces === undefined) {
          ctx.request.body = { ...body, spaces: [spaceSlug] };
        }
      }

      // Roles not visible in this workspace don't exist for it.
      if (detailMatch && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const ids = await visibleRoleIds(spaceSlug);
        if (!ids.has(Number(detailMatch[1]))) {
          return ctx.notFound('Role not found in this workspace');
        }
      }

      // Users follow their roles: no visible role here → the user doesn't exist here.
      const userDetailMatch = ctx.path.match(USER_DETAIL_RE);
      if (userDetailMatch && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const target = await strapi.db.query(ADMIN_USER_UID).findOne({
          where: { id: Number(userDetailMatch[1]) },
          populate: { roles: { select: ['id'] } },
        });
        if (target) {
          const ids = await visibleRoleIds(spaceSlug);
          const hasVisibleRole = (target.roles ?? []).some((role: { id: number }) =>
            ids.has(role.id)
          );
          if (!hasVisibleRole) {
            return ctx.notFound('User not found in this workspace');
          }
        }
      }
    }

    await next();

    /* ---- After the controller ---- */

    if (ctx.status >= 400 || ctx.method !== 'GET') {
      return;
    }

    if (ROLES_LIST_RE.test(ctx.path) && Array.isArray(ctx.body?.data)) {
      if (!isDefault) {
        const ids = await visibleRoleIds(spaceSlug);
        ctx.body.data = ctx.body.data.filter((role: { id: number }) => ids.has(role.id));
      }
      return;
    }

    if (!isDefault && USERS_LIST_RE.test(ctx.path) && Array.isArray(ctx.body?.data?.results)) {
      const ids = await visibleRoleIds(spaceSlug);
      ctx.body.data.results = ctx.body.data.results.filter((user: { roles?: { id: number }[] }) =>
        (user.roles ?? []).some((role) => ids.has(role.id))
      );
      return;
    }

    // Detail in the default workspace: attach the bound workspace slugs so the
    // edit form's "Available in workspaces" field can initialize.
    if (isDefault && detailMatch && ctx.body?.data?.id) {
      const populated = await strapi.db.query(ADMIN_ROLE_UID).findOne({
        where: { id: ctx.body.data.id },
        populate: { spaces: { select: ['slug'] } },
      });
      ctx.body.data.spaces = (populated?.spaces ?? []).map((s: { slug: string }) => s.slug);
    }
  });

  // Write path: extract `spaces: string[]` from the role create/update body
  // before the admin's strict validation rejects it, then write the M2M rows.
  wrapControllerForVisibility(strapi, {
    contentTypeUid: ADMIN_ROLE_UID,
    routes: [
      { method: 'POST', pathRegex: ROLES_LIST_RE },
      { method: 'PUT', pathRegex: ROLE_DETAIL_RE, isUpdate: true },
    ],
  });
};
