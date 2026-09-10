import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import {
  attachWorkspaceAccess,
  decideWritableInSpace,
  getBoundSlugs,
  refuseUnlessWritableInSpace,
  visibilityFilter,
  wrapControllerForVisibility,
} from './settings-visibility';

const ADMIN_ROLE_UID = 'admin::role';

const ROLES_LIST_RE = /^\/admin\/roles\/?$/;
const ROLE_DETAIL_RE = /^\/admin\/roles\/(\d+)\/?$/;
const ROLE_PERMISSIONS_RE = /^\/admin\/roles\/(\d+)\/permissions\/?$/;
const ROLES_BATCH_DELETE_RE = /^\/admin\/roles\/batch-delete\/?$/;

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
 *     automatically. Roles shared with other workspaces (platform-wide or
 *     multi-bound) are read-only there: name, description and permissions are
 *     edited from default (403 otherwise, `data.workspaceAccess` tells the admin).
 *
 * Users are handled by `admin-users-integration.ts` (membership = direct
 * binding or roles' bindings). Headerless callers (CLI, provisioning scripts)
 * stay unscoped.
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
      const permissionsMatch = ctx.path.match(ROLE_PERMISSIONS_RE);
      const targetId = detailMatch?.[1] ?? permissionsMatch?.[1];
      if (targetId && ['GET', 'PUT', 'DELETE'].includes(ctx.method)) {
        const ids = await visibleRoleIds(spaceSlug);
        if (!ids.has(Number(targetId))) {
          return ctx.notFound('Role not found in this workspace');
        }
        // Shared roles are read-only here.
        if (
          ['PUT', 'DELETE'].includes(ctx.method) &&
          (await refuseUnlessWritableInSpace(strapi, ctx, ADMIN_ROLE_UID, targetId, spaceSlug))
        ) {
          return;
        }
      }

      // Batch delete: only the roles this workspace may edit.
      if (ctx.method === 'POST' && ROLES_BATCH_DELETE_RE.test(ctx.path)) {
        const ids: unknown[] = Array.isArray(ctx.request?.body?.ids) ? ctx.request.body.ids : [];
        const visible = await visibleRoleIds(spaceSlug);
        const writable: unknown[] = [];
        for (const id of ids) {
          if (!visible.has(Number(id))) continue;
          const bound = await getBoundSlugs(strapi, ADMIN_ROLE_UID, Number(id));
          if (bound && decideWritableInSpace(bound, spaceSlug).writable) writable.push(id);
        }
        ctx.request.body = { ...ctx.request.body, ids: writable };
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

    // Detail in a sub-workspace: say whether the role is editable from here.
    if (!isDefault && detailMatch && ctx.body?.data?.id) {
      await attachWorkspaceAccess(strapi, ctx, ADMIN_ROLE_UID, spaceSlug);
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
