import type { Core } from '@strapi/types';

import { type Space } from './spaces';
import { getService } from '../utils';
import { runUnscoped } from '../utils/space-scope';

const ADMIN_USER_UID = 'admin::user';
const SPACE_UID = 'plugin::spaces.space';
const SUPER_ADMIN_CODE = 'strapi-super-admin';
const LAST_SPACE_KEY_PREFIX = 'last-space:';
const MEMBERSHIP_TTL_MS = 5_000;

interface UserBindings {
  id: number;
  isSuperAdmin: boolean;
  /** Slugs the user is bound to directly (the `spaces` M2M on admin users). */
  directSlugs: string[];
  /** One entry per role: the slugs the role is bound to (`[]` = platform-wide). */
  roleBindings: string[][];
}

export interface ComputeInput extends Omit<UserBindings, 'id'> {
  /** Every active workspace slug. */
  allActiveSlugs: string[];
}

/**
 * The membership rule, in one place: a user is a member of workspace S when
 * they are bound to it directly, hold a role bound to it, or hold a
 * platform-wide role (empty binding = everywhere). Super admins are members
 * everywhere. Archived workspaces never count.
 */
export const computeMemberSlugs = ({
  isSuperAdmin,
  directSlugs,
  roleBindings,
  allActiveSlugs,
}: ComputeInput): Set<string> => {
  const active = new Set(allActiveSlugs);
  if (isSuperAdmin || roleBindings.some((binding) => binding.length === 0)) {
    return active;
  }

  const slugs = new Set<string>();
  for (const slug of [...directSlugs, ...roleBindings.flat()]) {
    if (active.has(slug)) {
      slugs.add(slug);
    }
  }
  return slugs;
};

const USER_BINDINGS_POPULATE = {
  spaces: { select: ['slug'] },
  roles: { select: ['id', 'code'], populate: { spaces: { select: ['slug'] } } },
};

interface RawUser {
  id: number;
  spaces?: Array<{ slug: string }>;
  roles?: Array<{ id: number; code: string; spaces?: Array<{ slug: string }> }>;
}

const toBindings = (user: RawUser): UserBindings => ({
  id: user.id,
  isSuperAdmin: (user.roles ?? []).some((role) => role.code === SUPER_ADMIN_CODE),
  directSlugs: (user.spaces ?? []).map((space) => space.slug),
  roleBindings: (user.roles ?? []).map((role) => (role.spaces ?? []).map((space) => space.slug)),
});

const membershipService = ({ strapi }: { strapi: Core.Strapi }) => {
  const cache = new Map<string, { value: boolean; expiresAt: number }>();

  const activeSlugs = async (): Promise<string[]> =>
    (await getService('spaces').getAll()).map((space) => space.slug);

  const loadUser = (id: number): Promise<RawUser | null> =>
    runUnscoped(() =>
      strapi.db.query(ADMIN_USER_UID).findOne({
        where: { id },
        select: ['id'],
        populate: USER_BINDINGS_POPULATE,
      })
    );

  const memberSlugsOf = async (userId: number): Promise<Set<string>> => {
    const user = await loadUser(userId);
    if (!user) {
      return new Set();
    }
    return computeMemberSlugs({ ...toBindings(user), allActiveSlugs: await activeSlugs() });
  };

  return {
    computeMemberSlugs,

    /** The active workspaces the user belongs to, in the switcher's order. */
    async spacesForUser(userId: number): Promise<Space[]> {
      const [spaces, slugs] = await Promise.all([
        getService('spaces').getAll(),
        memberSlugsOf(userId),
      ]);
      return spaces.filter((space) => slugs.has(space.slug));
    },

    /** Ids of every user that is a member of the workspace (admin users are few). */
    async memberUserIds(slug: string): Promise<number[]> {
      const [users, allActiveSlugs] = await Promise.all([
        runUnscoped(() =>
          strapi.db.query(ADMIN_USER_UID).findMany({
            select: ['id'],
            populate: USER_BINDINGS_POPULATE,
          })
        ) as Promise<RawUser[]>,
        activeSlugs(),
      ]);
      return users
        .filter((user) => computeMemberSlugs({ ...toBindings(user), allActiveSlugs }).has(slug))
        .map((user) => user.id);
    },

    /**
     * Membership is checked for the default workspace too. It is tempting to
     * exempt it — "Strapi as it exists today" — but default is the *widest*
     * view: it sees every workspace's content. Exempting it let an admin
     * restricted to one workspace read all of them by asking for default.
     *
     * A standard install is unaffected: `computeMemberSlugs` makes super admins
     * and anyone holding a platform-wide role (a role bound to no workspace, the
     * default state) a member of every active workspace.
     */
    async isMember(userId: number, slug: string): Promise<boolean> {
      const key = `${userId}:${slug}`;
      const hit = cache.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return hit.value;
      }
      const value = (await memberSlugsOf(userId)).has(slug);
      cache.set(key, { value, expiresAt: Date.now() + MEMBERSHIP_TTL_MS });
      return value;
    },

    invalidate(): void {
      cache.clear();
    },

    /** Adds the workspace to the user's direct bindings (idempotent). */
    async bindUser(userId: number, slug: string): Promise<void> {
      const [user, space] = await Promise.all([
        runUnscoped(() =>
          strapi.db.query(ADMIN_USER_UID).findOne({
            where: { id: userId },
            select: ['id'],
            populate: { spaces: { select: ['id', 'slug'] } },
          })
        ) as Promise<{ id: number; spaces?: Array<{ id: number; slug: string }> } | null>,
        strapi.db.query(SPACE_UID).findOne({ where: { slug }, select: ['id'] }),
      ]);
      if (!user || !space) {
        return;
      }
      const current = (user.spaces ?? []).map((item) => item.id);
      if (current.includes(space.id)) {
        return;
      }
      await runUnscoped(() =>
        strapi.db
          .query(ADMIN_USER_UID)
          .update({ where: { id: userId }, data: { spaces: [...current, space.id] } })
      );
      cache.clear();
    },

    /** The workspace the user was last in, remembered across logins. */
    async getLastSlug(userId: number): Promise<string | null> {
      const store = strapi.store({ type: 'plugin', name: 'spaces' });
      const value = await store.get({ key: `${LAST_SPACE_KEY_PREFIX}${userId}` });
      return typeof value === 'string' ? value : null;
    },

    async setLastSlug(userId: number, slug: string): Promise<void> {
      const store = strapi.store({ type: 'plugin', name: 'spaces' });
      await store.set({ key: `${LAST_SPACE_KEY_PREFIX}${userId}`, value: slug });
    },

    async forgetUser(userId: number): Promise<void> {
      const store = strapi.store({ type: 'plugin', name: 'spaces' });
      await store.delete({ key: `${LAST_SPACE_KEY_PREFIX}${userId}` });
      cache.clear();
    },
  };
};

type MembershipService = typeof membershipService;

export default membershipService;
export type { MembershipService, UserBindings };
