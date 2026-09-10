import type { Core } from '@strapi/types';

import { DEFAULT_SPACE_SLUG } from './services/spaces';
import { wrapControllerForVisibility } from './settings-visibility';
import { getService } from './utils';
import { runUnscoped } from './utils/space-scope';

const ADMIN_USER_UID = 'admin::user';

const USERS_LIST_RE = /^\/admin\/users\/?$/;
const USER_DETAIL_RE = /^\/admin\/users\/(\d+)\/?$/;
const USERS_BATCH_DELETE_RE = /^\/admin\/users\/batch-delete\/?$/;

/** Routes a non-member may still call with a sub-workspace header (self-service, self-healing). */
const MEMBERSHIP_EXEMPT_PATHS = [
  /^\/spaces\/mine(\/|$)/,
  /^\/admin\/users\/me(\/|$)/,
  /^\/admin\/logout(\/|$)/,
  /^\/admin\/renew-token(\/|$)/,
];

const EMAIL_ALREADY_TAKEN = 'EMAIL_ALREADY_TAKEN';

const isEmailTakenError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  (err as { details?: { code?: string } }).details?.code === EMAIL_ALREADY_TAKEN;

/** Adds the requested roles to the user's, keeping the ids as strings for comparison. */
export const mergeRoleIds = (
  current: Array<number | string>,
  requested: Array<number | string> | undefined
): Array<number | string> => {
  const seen = new Set(current.map(String));
  const merged = [...current];
  for (const roleId of requested ?? []) {
    if (!seen.has(String(roleId))) {
      seen.add(String(roleId));
      merged.push(roleId);
    }
  }
  return merged;
};

/**
 * Spaces × admin users. Users belong to workspaces (many-to-many, plus their
 * roles' bindings — see `services/membership.ts`):
 *
 *   - **Default workspace** — sees and manages every user; the user forms get
 *     a "Workspaces" field whose `spaces` body field is consumed here by
 *     `wrapControllerForVisibility`.
 *   - **Other workspaces** — the users list only shows members (with correct
 *     pagination totals), any other user is a 404, and inviting binds the
 *     invitee to the workspace. Inviting an email that already has an account
 *     **adds that account** to the workspace (roles merged) instead of failing
 *     with "email already taken". Bindings and deletions are managed from default.
 *   - **Guard** — a request carrying a sub-workspace header from a user who is
 *     not a member of it is refused (403), except the self-service routes the
 *     switcher needs to recover.
 *
 * Headerless callers (CLI, provisioning scripts) stay unscoped.
 */
export const patchAdminUsersForSpaces = (strapi: Core.Strapi) => {
  const membership = () => getService('membership');
  const userService = () => strapi.service('admin::user') as any;

  /* ----------------------------- List filtering ---------------------------- */

  // The controller resolves the service per call, so patching the registered
  // service object is observed. Filtering in the query keeps totals right.
  const service = userService();
  const originalFindPage = service.findPage.bind(service);
  service.findPage = async (params: any = {}) => {
    const spaceSlug = strapi.requestContext.get()?.state?.spaceSlug as string | undefined;
    if (!spaceSlug || spaceSlug === DEFAULT_SPACE_SLUG) {
      return originalFindPage(params);
    }
    const ids = await membership().memberUserIds(spaceSlug);
    const memberFilter = { id: { $in: ids } };
    return originalFindPage({
      ...params,
      filters: params.filters ? { $and: [params.filters, memberFilter] } : memberFilter,
    });
  };

  /* ------------------------------ Membership guard ------------------------- */

  const auth = strapi.get('auth');
  const originalAuthenticate = auth.authenticate.bind(auth);

  /**
   * An admin only ever acts inside a workspace they belong to.
   *
   * Two things this closes, both of which handed an admin restricted to one
   * workspace the *whole* deployment:
   *
   *  - asking for the default workspace, which sees every workspace's content —
   *    so it is the one that most needs the check, not the one to exempt;
   *  - sending no workspace header at all, which used to mean "platform view",
   *    i.e. no filter. That meaning is right for the CLI, the bootstrap and the
   *    content API; for an authenticated admin it is a way around the header.
   *    Such a request is resolved to the default workspace and then checked like
   *    any other.
   *
   * Only the admin strategy is concerned: API tokens carry their own workspace
   * binding (see `api-tokens-integration.ts`), and public content-API requests
   * have no admin user to check.
   */
  auth.authenticate = async (ctx: any, next: () => Promise<any>) => {
    return originalAuthenticate(ctx, async () => {
      const userId = ctx.state?.user?.id as number | undefined;
      const strategyName = ctx.state?.auth?.strategy?.name;

      if (
        strategyName !== 'admin' ||
        userId === undefined ||
        MEMBERSHIP_EXEMPT_PATHS.some((pattern) => pattern.test(ctx.path))
      ) {
        return next();
      }

      if (!ctx.state.spaceSlug) {
        const fallback = await getService('spaces').getBySlug(DEFAULT_SPACE_SLUG);
        if (fallback) {
          ctx.state.spaceId = fallback.id;
          ctx.state.spaceSlug = fallback.slug;
        }
      }

      const spaceSlug = ctx.state.spaceSlug as string | undefined;
      if (spaceSlug && !(await membership().isMember(userId, spaceSlug))) {
        return ctx.forbidden('You are not a member of this workspace');
      }

      return next();
    });
  };

  /* --------------------------- Detail / invite flow ------------------------ */

  strapi.server.use(async (ctx: any, next: () => Promise<any>) => {
    const spaceSlug = ctx.state?.spaceSlug as string | undefined;
    if (!spaceSlug) {
      return next();
    }

    const isDefault = spaceSlug === DEFAULT_SPACE_SLUG;
    const detailMatch = ctx.path.match(USER_DETAIL_RE);
    const isInvite = ctx.method === 'POST' && USERS_LIST_RE.test(ctx.path);
    let invite: { email?: string; roles?: Array<number | string> } | undefined;

    /* ---- Before the controller ---- */

    if (!isDefault) {
      if (
        (detailMatch && ctx.method === 'DELETE') ||
        (ctx.method === 'POST' && USERS_BATCH_DELETE_RE.test(ctx.path))
      ) {
        return ctx.forbidden('Accounts are managed from the default workspace');
      }

      if (detailMatch && ['GET', 'PUT'].includes(ctx.method)) {
        if (!(await membership().isMember(Number(detailMatch[1]), spaceSlug))) {
          return ctx.notFound('User not found in this workspace');
        }
        // Bindings are edited from default only.
        if (ctx.method === 'PUT' && ctx.request?.body && 'spaces' in ctx.request.body) {
          const { spaces: _spaces, ...rest } = ctx.request.body;
          ctx.request.body = rest;
        }
      }

      if (isInvite) {
        const body = ctx.request?.body ?? {};
        invite = { email: body.email, roles: body.roles };
        // The invitee joins the workspace they are invited from.
        ctx.request.body = { ...body, spaces: [spaceSlug] };
      }
    }

    try {
      await next();
    } catch (err) {
      if (!invite?.email || !isEmailTakenError(err)) {
        throw err;
      }
      // An existing account is added to the workspace instead of failing.
      const handled = await addExistingAccount(ctx, invite, spaceSlug);
      if (!handled) {
        throw err;
      }
      return;
    }

    /* ---- After the controller ---- */

    if (ctx.status >= 400) {
      return;
    }

    if (isInvite && ctx.body?.data?.id) {
      membership().invalidate();
    }

    // Detail in the default workspace: attach the bound workspace slugs so the
    // edit form's "Workspaces" field can initialize.
    if (isDefault && ctx.method === 'GET' && detailMatch && ctx.body?.data?.id) {
      const populated = await strapi.db.query(ADMIN_USER_UID).findOne({
        where: { id: ctx.body.data.id },
        populate: { spaces: { select: ['slug'] } },
      });
      ctx.body.data.spaces = (populated?.spaces ?? []).map((s: { slug: string }) => s.slug);
    }
  });

  const addExistingAccount = async (
    ctx: any,
    invite: { email?: string; roles?: Array<number | string> },
    spaceSlug: string
  ): Promise<boolean> => {
    const existing = await runUnscoped(() =>
      strapi.db.query(ADMIN_USER_UID).findOne({
        where: { email: { $eqi: String(invite.email) } },
        populate: { roles: { select: ['id'] } },
      })
    );
    if (!existing) {
      return false;
    }

    // Roles were checked against the caller's ceiling by the controller
    // before it refused the email, so merging them here grants nothing new.
    const currentRoleIds = (existing.roles ?? []).map((role: { id: number }) => role.id);
    const mergedRoleIds = mergeRoleIds(currentRoleIds, invite.roles);
    if (mergedRoleIds.length !== currentRoleIds.length) {
      await runUnscoped(() =>
        strapi.db
          .query(ADMIN_USER_UID)
          .update({ where: { id: existing.id }, data: { roles: mergedRoleIds } })
      );
    }

    await membership().bindUser(existing.id, spaceSlug);

    const user = await userService().findOne(existing.id);
    const data = userService().sanitizeUser(user);
    // A pending account keeps its registration link; an active one needs none.
    if (user.registrationToken && !user.isActive) {
      Object.assign(data, { registrationToken: user.registrationToken });
    }
    Object.assign(data, { addedToWorkspace: spaceSlug });

    ctx.status = 201;
    ctx.body = { data };
    return true;
  };

  /* ----------------------- Bindings write path (default) ------------------- */

  // Registered after the middleware above so the forced `spaces` of an invite
  // is already on the body when the wrapper extracts it.
  wrapControllerForVisibility(strapi, {
    contentTypeUid: ADMIN_USER_UID,
    routes: [
      { method: 'POST', pathRegex: USERS_LIST_RE },
      { method: 'PUT', pathRegex: USER_DETAIL_RE, isUpdate: true },
    ],
  });

  /* ------------------------------- Cleanup --------------------------------- */

  strapi.db.lifecycles.subscribe({
    models: [ADMIN_USER_UID],
    async afterDelete(event: any) {
      const id = event?.result?.id ?? event?.params?.where?.id;
      if (typeof id === 'number') {
        await membership().forgetUser(id);
      }
    },
    afterUpdate() {
      membership().invalidate();
    },
  });
};
