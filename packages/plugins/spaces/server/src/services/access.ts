import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { Context } from 'koa';

import {
  ACTIONS,
  GLOBAL_SPACE_HEADER_VALUE,
  SPACE_HEADER,
  type Space,
  type SpaceScope,
} from '../../../shared/constants';
import { resolveTokenSpace } from '../integrations/api-tokens';
import { getRequestScope, setRequestScope } from '../scope/context';

const { ForbiddenError } = errors;

/** Where the settled scope is cached on the request, alongside the scope itself. */
const RESOLUTION_STATE_KEY = 'spacesResolution';

/**
 * Routes that have to answer before the caller has a space: signing in, finding
 * out which spaces you have, and the endpoints the admin shell loads on its way
 * up.
 *
 * They are not exempt from tenancy. They are left `unresolved`, so if one of
 * them ever reads space-scoped data it is refused — rather than quietly reading
 * across every space.
 */
const SCOPE_FREE_PATHS = [
  '/admin/spaces/mine',
  '/admin/login',
  '/admin/logout',
  '/admin/renew-token',
  '/admin/access-token',
  '/admin/register',
  '/admin/register-admin',
  '/admin/registration-info',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/init',
  '/admin/information',
  '/admin/project-type',
  '/admin/project-settings',
  '/admin/telemetry-properties',
  '/admin/users/me',
  '/_health',
];

const isScopeFree = (path: string) => SCOPE_FREE_PATHS.some((prefix) => path.startsWith(prefix));

export interface Resolution {
  scope: SpaceScope;
  /**
   * Who the scope was worked out for. A route that authenticates itself settles
   * its identity after this has already run for an anonymous caller, so the
   * answer has to be recomputed rather than reused.
   */
  resolvedFor: number | null;
  /**
   * Set when the caller *named* a space they may not enter. That is a
   * deliberate, answerable request, so it is refused outright — unlike simply
   * having no space, which leaves the scope unresolved and only bites if
   * space-scoped data is actually touched.
   */
  denied?: string;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const spacesService = () => strapi.service('plugin::spaces.spaces');
  const membershipService = () => strapi.service('plugin::spaces.membership');

  /**
   * Whether a user may work across every space at once, and reach data that
   * belongs to none.
   *
   * This is a permission, not a consequence of being a super admin by name —
   * though the super admin holds every permission and therefore holds this one.
   */
  const canAccessAllSpaces = async (user: AdminUserLike): Promise<boolean> => {
    if (strapi.service('admin::role').hasSuperAdminRole(user)) {
      return true;
    }

    const permissions = await strapi.db.query('admin::permission').findMany({
      where: { action: ACTIONS.accessAll, role: { users: { id: user.id } } },
      limit: 1,
    });

    return permissions.length > 0;
  };

  const service = {
    canAccessAllSpaces,

    /** The raw value of the space header, if the caller sent one. */
    readHeader(ctx: Context): string | undefined {
      const raw = ctx.get?.(SPACE_HEADER);

      return raw ? raw.trim() : undefined;
    },

    /**
     * Works out which space a request runs in, from the caller's identity and
     * the space they asked for.
     *
     * The rules, in order:
     *  - an anonymous or non-admin caller gets the space the header names, or
     *    the default space;
     *  - a caller who may access all spaces gets what they asked for, including
     *    the cross-space view;
     *  - anyone else must be a member of the space they asked for, and falls
     *    back to the one space they belong to;
     *  - a caller who belongs to no space at all is refused.
     *
     * The result is memoised on the request, because it is needed both while
     * the ability is being built and again once authentication has finished.
     */
    async resolve(ctx: Context, asUser?: AdminUserLike): Promise<Resolution> {
      const caller = asUser ?? (ctx.state?.user as AdminUserLike | undefined);
      const callerId = caller?.id ?? null;
      const cached = ctx.state?.[RESOLUTION_STATE_KEY] as Resolution | undefined;

      if (cached && cached.resolvedFor === callerId) {
        return cached;
      }

      const resolution = await service.computeResolution(ctx, asUser);

      if (ctx.state) {
        ctx.state[RESOLUTION_STATE_KEY] = resolution;
      }

      return resolution;
    },

    async computeResolution(ctx: Context, asUser?: AdminUserLike): Promise<Resolution> {
      const resolution = await service.deriveResolution(ctx, asUser);
      const caller = asUser ?? (ctx.state?.user as AdminUserLike | undefined);

      return { ...resolution, resolvedFor: caller?.id ?? null };
    },

    async deriveResolution(
      ctx: Context,
      asUser?: AdminUserLike
    ): Promise<Omit<Resolution, 'resolvedFor'>> {
      // A token carries its own space, decided when it was issued. It wins over
      // anything the request asks for, because the request is the token.
      const bound = await resolveTokenSpace(strapi, ctx);

      if (bound) {
        return { scope: { mode: 'space', ...bound } };
      }

      const requested = service.readHeader(ctx);
      // The caller is passed in while the ability is still being built, because
      // at that point the strategy has not put the user on the request yet.
      const user = asUser ?? (ctx.state?.user as AdminUserLike | undefined);

      // No admin user behind the request: the public content API, or a route
      // that runs before authentication. Such a caller has no membership, so
      // the header alone selects the space — which is safe because what they
      // may then read is decided by the content API's own permissions.
      if (!user?.id) {
        return service.resolveForAnonymous(requested);
      }

      const global = await canAccessAllSpaces(user);

      if (requested === GLOBAL_SPACE_HEADER_VALUE) {
        return global
          ? { scope: { mode: 'global' } }
          : {
              scope: { mode: 'unresolved', reason: 'Cross-space access is not allowed.' },
              denied: 'You are not allowed to work across every space.',
            };
      }

      if (requested) {
        const space = await spacesService().resolveHeaderValue(requested);

        if (!space) {
          return {
            scope: { mode: 'unresolved', reason: `Unknown or archived space "${requested}".` },
            denied: `Unknown or archived space "${requested}".`,
          };
        }

        if (global || (await membershipService().isMember(user.id, space.id))) {
          return { scope: toScope(space) };
        }

        return {
          scope: {
            mode: 'unresolved',
            reason: `You are not a member of the space "${space.slug}".`,
          },
          denied: `You are not a member of the space "${space.slug}".`,
        };
      }

      return service.resolveDefaultFor(user, global);
    },

    async resolveForAnonymous(requested?: string): Promise<Omit<Resolution, 'resolvedFor'>> {
      if (requested && requested !== GLOBAL_SPACE_HEADER_VALUE) {
        const space = await spacesService().resolveHeaderValue(requested);

        if (!space) {
          return {
            scope: { mode: 'unresolved', reason: `Unknown or archived space "${requested}".` },
            denied: `Unknown or archived space "${requested}".`,
          };
        }

        return { scope: toScope(space) };
      }

      const fallback = await spacesService().getDefault();

      return fallback
        ? { scope: toScope(fallback) }
        : { scope: { mode: 'unresolved', reason: 'No space is available.' } };
    },

    /** The space a caller lands in when they did not name one. */
    async resolveDefaultFor(
      user: AdminUserLike,
      global: boolean
    ): Promise<Omit<Resolution, 'resolvedFor'>> {
      const memberships = await membershipService().listForUser(user.id);

      if (memberships.length > 0) {
        // A member of exactly one space always lands there. A member of
        // several lands in the default one when they belong to it, so that the
        // landing space is stable rather than depending on row order.
        const preferred =
          memberships.find((membership: { space: Space }) => membership.space.isDefault) ??
          memberships[0];

        return { scope: toScope(preferred.space) };
      }

      if (global) {
        const fallback = await spacesService().getDefault();

        return fallback ? { scope: toScope(fallback) } : { scope: { mode: 'global' } };
      }

      // Not a denial: the admin shell must still load so it can tell them so.
      return {
        scope: {
          mode: 'unresolved',
          reason: 'You do not belong to any space. Ask an administrator to add you to one.',
        },
      };
    },

    /**
     * Settles the scope of a request and records it, or refuses the request.
     *
     * Runs once authentication has finished, for authenticated and anonymous
     * requests alike, so that no request reaches a controller without a space.
     */
    async applyToRequest(ctx: Context): Promise<void> {
      const caller = (ctx.state?.user as AdminUserLike | undefined)?.id ?? null;
      const settled = ctx.state?.[RESOLUTION_STATE_KEY] as Resolution | undefined;

      // Already settled for this caller. A second run with a new identity —
      // a route that authenticates itself — falls through and redoes the work.
      if (getRequestScope(ctx) && settled?.resolvedFor === caller) {
        return;
      }

      if (isScopeFree(ctx.path ?? '')) {
        setRequestScope(ctx, { mode: 'unresolved', reason: 'This route is not space-scoped.' });

        return;
      }

      const { scope, denied } = await service.resolve(ctx);

      if (denied) {
        throw new ForbiddenError(denied);
      }

      setRequestScope(ctx, scope);
    },
  };

  return service;
};

type AdminUserLike = { id: number; roles?: unknown[] };

const toScope = (space: Space): SpaceScope => ({
  mode: 'space',
  id: space.id,
  slug: space.slug,
});
