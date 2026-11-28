import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { PERMISSION_UID, PROFILE_UID, ROLE_UID, USER_UID } from '../../constants';
import abilityService, { PERMISSIONS_TTL_MS } from '../ability';

type Subscriber = { models: string[] } & Record<string, unknown>;

interface Row {
  action: string;
  roleDocumentId: string;
}

const row = (roleDocumentId: string, action: string) => ({
  documentId: `${roleDocumentId}-${action}`,
  action,
  subject: null as string | null,
  properties: {} as Record<string, unknown>,
  conditions: [] as Array<{ name: string; params?: Record<string, unknown> }>,
  roleDocumentId,
  roleName: roleDocumentId,
});

/** The end-user type, as far as the condition user reads it: which attributes are private */
const USER_SCHEMA = {
  uid: USER_UID,
  attributes: {
    email: { type: 'email' },
    name: { type: 'string' },
    username: { type: 'string' },
    emailVerified: { type: 'boolean' },
    twoFactorEnabled: { type: 'boolean' },
    company: { type: 'string' },
    createdAt: { type: 'datetime' },
    role: { type: 'string', private: true },
    banned: { type: 'boolean', private: true },
    banReason: { type: 'string', private: true },
    banExpires: { type: 'datetime', private: true },
    roles: { type: 'relation', relation: 'manyToMany', target: 'plugin::end-users.role' },
  },
};

/** The profile type: a private attribute, a scalar, to-one and to-many relations, and a media */
const PROFILE_SCHEMA = {
  uid: PROFILE_UID,
  attributes: {
    user: { type: 'relation', relation: 'oneToOne', target: USER_UID },
    plan: { type: 'string' },
    internalNote: { type: 'string', private: true },
    pin: { type: 'password' },
    organization: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::organization.organization',
    },
    secretOrg: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::organization.organization',
      private: true,
    },
    teams: { type: 'relation', relation: 'manyToMany', target: 'api::team.team' },
    avatar: { type: 'media' },
  },
};

/**
 * Fakes of what the service reaches for: the permission service (`findForRoles` answers from a
 * table the test edits), the role table for Public, the Content API permissions (`generateAbility`
 * records the rows and the caller it was asked to build an ability from), the end-user type and
 * the database layer's lifecycles.
 */
const setup = (initial: Row[] = [], { readsProfile = false } = {}) => {
  const table = [...initial].map(({ roleDocumentId, action }) => row(roleDocumentId, action));
  const findForRoles = vi.fn(async (ids: string[]) =>
    table.filter((permission) => ids.includes(permission.roleDocumentId))
  );
  const findPublic = vi.fn(
    async () =>
      ({ documentId: 'role-public', name: 'Public', type: 'public' }) as {
        documentId: string;
        name: string;
        type: string;
      } | null
  );
  const generateAbility = vi.fn<
    (
      permissions: Array<{ action: string }>,
      options: { user: unknown }
    ) => Promise<{ permissions: unknown; can(action: string): boolean }>
  >(async (permissions) => ({
    permissions,
    can: (action: string) => permissions.some((permission) => permission.action === action),
  }));
  const describePermissions = vi.fn(() => ({
    routes: ['plugin::end-users.me.find'],
    subjects: { 'plugin::end-users.profile': {} },
  }));
  const subscribers: Subscriber[] = [];

  const contentType = vi.fn((uid: string): unknown => {
    if (uid === USER_UID) return USER_SCHEMA;
    if (uid === PROFILE_UID) return PROFILE_SCHEMA;

    return undefined;
  });
  // The end-user type through the Document Service: what `conditionUserFor` finds a user with
  const findFirst = vi.fn(async (): Promise<Record<string, unknown> | null> => null);
  // The profile type through the Document Service: what the condition user's profile is read with
  const findProfile = vi.fn<(params: unknown) => Promise<Record<string, unknown> | null>>(
    async () => null
  );
  const documents = vi.fn((uid: string) => {
    if (uid === PROFILE_UID) return { findFirst: findProfile };
    if (uid !== USER_UID) throw new Error(`unexpected documents on ${uid}`);

    return { findFirst };
  });

  const strapi = {
    plugin: vi.fn(() => ({ service: vi.fn(() => ({ findForRoles })) })),
    contentType,
    documents,
    db: {
      query: vi.fn((uid: string) => {
        if (uid !== ROLE_UID) throw new Error(`unexpected query on ${uid}`);

        return { findOne: findPublic };
      }),
      lifecycles: { subscribe: vi.fn((subscriber: Subscriber) => subscribers.push(subscriber)) },
    },
    contentAPI: {
      permissions: {
        generateAbility,
        describe: describePermissions,
        conditions: { readsProfile: () => readsProfile },
      },
    },
  } as unknown as Core.Strapi;

  // Runs a subscriber's handler for an event, and fails the test when there is none to run
  const fire = (subscriber: { [event: string]: unknown } | undefined, event: string) => {
    const handler = subscriber?.[event];

    if (typeof handler !== 'function') {
      throw new Error(`No subscriber handles ${event}`);
    }

    handler();
  };

  const subscriberFor = (uid: string) => subscribers.find(({ models }) => models.includes(uid));

  return {
    ability: abilityService({ strapi }),
    table,
    findForRoles,
    findPublic,
    generateAbility,
    describePermissions,
    contentType,
    findFirst,
    findProfile,
    documents,
    subscribers,
    subscriberFor,
    fire,
    // What the engine was last asked to build from
    lastActions: () =>
      ((generateAbility.mock.calls.at(-1)?.[0] ?? []) as Array<{ action: string }>).map(
        ({ action }) => action
      ),
    // Who the conditions were last to be evaluated for
    lastUser: () => generateAbility.mock.calls.at(-1)?.[1].user,
  };
};

const USER = { documentId: 'user-1' };

/** What a route's scope asks of an ability. Its type wants a subject too, which the first version of the plugin has none of. */
const allows = (ability: unknown, action: string) =>
  (ability as { can(action: string): boolean }).can(action);

describe('ability service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // What `contentTypes.isPrivateAttribute` reads for the project-wide private attributes
    vi.stubGlobal('strapi', {
      config: { get: (_key: string, fallback?: unknown) => fallback },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('forUser', () => {
    it("builds the ability from the actions of the user's role", async () => {
      const { ability, lastActions } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
        { roleDocumentId: 'role-other', action: 'api::note.note.delete' },
      ]);

      const built = await ability.forUser(USER, [{ documentId: 'role-a' }]);

      expect(lastActions()).toEqual(['api::note.note.find']);
      expect(allows(built, 'api::note.note.find')).toBe(true);
      expect(allows(built, 'api::note.note.delete')).toBe(false);
    });

    it('unions the permissions of several roles into one ability', async () => {
      const { ability, generateAbility, lastActions } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
        { roleDocumentId: 'role-b', action: 'api::note.note.findOne' },
        { roleDocumentId: 'role-c', action: 'api::note.note.delete' },
      ]);

      const built = await ability.forUser(USER, [
        { documentId: 'role-a' },
        { documentId: 'role-b' },
      ]);

      expect(generateAbility).toHaveBeenCalledTimes(1);
      expect(lastActions().sort()).toEqual(['api::note.note.find', 'api::note.note.findOne']);
      expect(allows(built, 'api::note.note.find')).toBe(true);
      expect(allows(built, 'api::note.note.findOne')).toBe(true);
      expect(allows(built, 'api::note.note.delete')).toBe(false);
    });

    it('forUser hands the cached rows, with their role names, to generateAbility', async () => {
      const { ability, generateAbility, table } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
        { roleDocumentId: 'role-b', action: 'api::note.note.find' },
        { roleDocumentId: 'role-b', action: 'plugin::end-users.me.find' },
      ]);

      table[1].roleName = 'Editors';
      table[1].subject = 'api::note.note';
      table[1].properties = { fields: ['title'], populateDepth: 1 };
      table[1].conditions = [{ name: 'plugin::end-users.is-owner', params: { field: 'owner' } }];

      await ability.forUser(USER, [{ documentId: 'role-a' }, { documentId: 'role-b' }]);

      expect(generateAbility).toHaveBeenCalledTimes(1);
      // Every row, the same action from two roles included: core makes one route rule of it,
      // and keeps each row's own data rule and the role it came from
      expect(generateAbility.mock.calls[0][0]).toEqual([
        {
          action: 'api::note.note.find',
          subject: null,
          properties: {},
          conditions: [],
          origin: { role: 'role-a' },
        },
        {
          action: 'api::note.note.find',
          subject: 'api::note.note',
          properties: { fields: ['title'], populateDepth: 1 },
          conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'owner' } }],
          origin: { role: 'Editors' },
        },
        {
          action: 'plugin::end-users.me.find',
          subject: null,
          properties: {},
          conditions: [],
          origin: { role: 'role-b' },
        },
      ]);
    });

    it('forUser builds the condition user from the row without private attributes', async () => {
      const { ability, lastUser } = setup();
      const stored = {
        id: 7,
        documentId: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        username: null,
        emailVerified: true,
        twoFactorEnabled: false,
        company: 'Acme',
        createdAt: '2026-10-28T00:00:00.000Z',
        role: 'admin',
        banned: false,
        banReason: null,
        banExpires: null,
        // Not an attribute of the type: never a placeholder
        sessionSecret: 'x',
      };

      await ability.forUser(stored, [
        {
          documentId: 'role-a',
          name: 'Authenticated',
          type: 'authenticated',
          requireTwoFactor: false,
        },
        { documentId: 'role-b', name: 'Editors', type: 'custom', requireTwoFactor: true },
      ]);

      expect(lastUser()).toEqual({
        uid: USER_UID,
        id: 7,
        documentId: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        username: null,
        emailVerified: true,
        twoFactorEnabled: false,
        company: 'Acme',
        createdAt: '2026-10-28T00:00:00.000Z',
        roles: [
          { documentId: 'role-a', name: 'Authenticated', type: 'authenticated' },
          { documentId: 'role-b', name: 'Editors', type: 'custom' },
        ],
      });
    });

    it('leaves out the attributes the project makes private for every type', async () => {
      const { ability, lastUser, contentType } = setup();

      // A schema object of its own: utils keeps a model's project-wide private attributes for the
      // model's lifetime, and the shared one was read with none
      contentType.mockReturnValue({ ...USER_SCHEMA });
      vi.stubGlobal('strapi', {
        config: {
          get: (key: string, fallback?: unknown) =>
            key === 'api.responses.privateAttributes' ? ['createdAt'] : fallback,
        },
      });

      await ability.forUser(
        { id: 7, documentId: 'user-1', email: 'a@x.io', createdAt: '2026-10-28' },
        []
      );

      expect(lastUser()).not.toHaveProperty('createdAt');
      expect(lastUser()).toMatchObject({ email: 'a@x.io' });
    });

    it('keeps the uid, id, documentId and roles it sets over attributes of the same name', async () => {
      const { ability, lastUser } = setup();

      await ability.forUser(
        { id: 7, documentId: 'user-1', uid: 'forged', roles: 'forged' } as Record<string, unknown>,
        [{ documentId: 'role-a', name: 'Authenticated', type: 'authenticated' }]
      );

      expect(lastUser()).toEqual({
        uid: USER_UID,
        id: 7,
        documentId: 'user-1',
        roles: [{ documentId: 'role-a', name: 'Authenticated', type: 'authenticated' }],
      });
    });

    it('gives only the identity when the end-user type is not the one registered', async () => {
      const { ability, lastUser, contentType } = setup();

      contentType.mockReturnValue({ ...USER_SCHEMA, uid: 'plugin::other.user' });

      await ability.forUser({ id: 7, documentId: 'user-1', email: 'a@x.io' }, []);

      expect(lastUser()).toEqual({ uid: USER_UID, id: 7, documentId: 'user-1', roles: [] });
    });

    it('evaluates no condition for a caller with no user: Public', async () => {
      const { ability, generateAbility } = setup();

      await ability.forUser(null, []);

      expect(generateAbility).toHaveBeenCalledWith([], { user: null });
    });

    it('asks for each role once, even when it is given twice', async () => {
      const { ability, findForRoles } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      await ability.forUser(USER, [{ documentId: 'role-a' }, { documentId: 'role-a' }]);

      expect(findForRoles).toHaveBeenCalledWith(['role-a']);
    });

    it('is an ability that allows nothing for a user with no roles', async () => {
      const { ability, findForRoles, generateAbility } = setup();

      const built = await ability.forUser(USER, []);

      expect(findForRoles).not.toHaveBeenCalled();
      expect(generateAbility).toHaveBeenCalledWith([], {
        user: { uid: USER_UID, documentId: 'user-1', roles: [] },
      });
      expect(allows(built, 'api::note.note.find')).toBe(false);
    });

    it("gives a user the permissions of their roles only, not Public's", async () => {
      const { ability, findForRoles, findPublic } = setup([
        { roleDocumentId: 'role-public', action: 'api::note.note.find' },
        { roleDocumentId: 'role-a', action: 'api::note.note.findOne' },
      ]);

      const built = await ability.forUser(USER, [{ documentId: 'role-a' }]);

      expect(findPublic).not.toHaveBeenCalled();
      expect(findForRoles).toHaveBeenCalledWith(['role-a']);
      expect(allows(built, 'api::note.note.find')).toBe(false);
    });

    describe('the profile', () => {
      const stored = { id: 7, documentId: 'user-1', email: 'alice@example.com' };

      it('loads the profile once when a registered condition reads it', async () => {
        const { ability, findProfile, lastUser } = setup([], { readsProfile: true });

        findProfile.mockResolvedValueOnce({
          id: 3,
          documentId: 'profile-1',
          plan: 'pro',
          organization: { documentId: 'org-1' },
        });

        await ability.forUser(stored, [{ documentId: 'role-a' }]);

        expect(findProfile).toHaveBeenCalledTimes(1);
        expect(findProfile).toHaveBeenCalledWith({
          filters: { user: { documentId: 'user-1' } },
          populate: { user: { fields: ['documentId'] }, organization: { fields: ['documentId'] } },
        });
        expect(lastUser()).toMatchObject({
          profile: {
            documentId: 'profile-1',
            plan: 'pro',
            organization: { documentId: 'org-1' },
          },
        });
      });

      it('gives null when the user has no profile', async () => {
        const { ability, lastUser } = setup([], { readsProfile: true });

        await ability.forUser(stored, []);

        expect(lastUser()).toHaveProperty('profile', null);
      });

      it('does not load it otherwise', async () => {
        const { ability, findProfile, lastUser } = setup();

        await ability.forUser(stored, [{ documentId: 'role-a' }]);

        expect(findProfile).not.toHaveBeenCalled();
        expect(lastUser()).not.toHaveProperty('profile');
      });

      it('does not load it for a request with no user', async () => {
        const { ability, findProfile, lastUser } = setup([], { readsProfile: true });

        await ability.forUser(null, []);

        expect(findProfile).not.toHaveBeenCalled();
        expect(lastUser()).toBeNull();
      });

      it('leaves out private and password attributes', async () => {
        const { ability, findProfile, lastUser } = setup([], { readsProfile: true });

        findProfile.mockResolvedValueOnce({
          id: 3,
          documentId: 'profile-1',
          plan: 'pro',
          internalNote: 'do not read',
          pin: '$2a$10$hash',
          secretOrg: { documentId: 'org-9' },
          notInSchema: 'x',
        });

        await ability.forUser(stored, []);

        const { profile } = lastUser() as { profile: Record<string, unknown> };

        expect(profile).toEqual({ documentId: 'profile-1', plan: 'pro' });
        expect(findProfile.mock.calls[0][0]).not.toMatchObject({
          populate: { secretOrg: expect.anything() },
        });
      });

      it('gives to-one relations as { documentId } and drops to-many ones', async () => {
        const { ability, findProfile, lastUser } = setup([], { readsProfile: true });

        findProfile.mockResolvedValueOnce({
          documentId: 'profile-1',
          user: { id: 7, documentId: 'user-1', email: 'alice@example.com' },
          organization: { id: 4, documentId: 'org-1', name: 'Acme' },
          teams: [{ documentId: 'team-1' }],
          avatar: { url: '/x.png' },
        });

        await ability.forUser(stored, []);

        expect((lastUser() as { profile: unknown }).profile).toEqual({
          documentId: 'profile-1',
          user: { documentId: 'user-1' },
          organization: { documentId: 'org-1' },
        });
        expect(Object.keys(findProfile.mock.calls[0][0] as object)).not.toContain('teams');
      });
    });

    describe('without a user', () => {
      it('is the Public role, found by type, whatever roles are passed', async () => {
        const { ability, findPublic, findForRoles, lastActions } = setup([
          { roleDocumentId: 'role-public', action: 'api::note.note.find' },
          { roleDocumentId: 'role-a', action: 'api::note.note.delete' },
        ]);

        await ability.forUser(null, [{ documentId: 'role-a' }]);

        expect(findPublic).toHaveBeenCalledWith({
          where: { type: 'public' },
          select: ['documentId', 'name', 'type'],
          orderBy: { id: 'asc' },
        });
        expect(findForRoles).toHaveBeenCalledWith(['role-public']);
        expect(lastActions()).toEqual(['api::note.note.find']);
      });

      it('allows nothing when Public has no permissions', async () => {
        const { ability } = setup();

        expect(allows(await ability.forUser(null, []), 'api::note.note.find')).toBe(false);
      });

      it('allows nothing, and keeps looking, when there is no Public role yet', async () => {
        const { ability, findPublic, findForRoles } = setup();
        findPublic.mockResolvedValue(null);

        expect(allows(await ability.forUser(null, []), 'api::note.note.find')).toBe(false);
        expect(findForRoles).not.toHaveBeenCalled();

        await ability.forUser(null, []);

        // A role that is missing is not remembered as missing
        expect(findPublic).toHaveBeenCalledTimes(2);
      });

      it('finds the Public role once, not on every request', async () => {
        const { ability, findPublic } = setup();

        await ability.forUser(null, []);
        await ability.forUser(null, []);
        await ability.forUser(null, []);

        expect(findPublic).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('conditionUserFor', () => {
    const userQuery = { $or: [{ emailVerified: { $eq: true } }] };

    it("finds the user within what the admin can see, with the roles they hold, as a condition's user", async () => {
      const { ability, findFirst, documents } = setup();

      findFirst.mockResolvedValueOnce({
        id: 7,
        documentId: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        company: 'Analytical',
        // Private on the end-user type, or not on it at all
        banned: true,
        banReason: 'spam',
        password: 'hash',
        roles: [
          { id: 1, documentId: 'role-a', name: 'Editors', type: 'custom' },
          { id: 2, documentId: 'role-b', name: 'Authenticated', type: 'authenticated' },
        ],
      });

      await expect(ability.conditionUserFor('user-1', userQuery)).resolves.toEqual({
        email: 'ada@example.com',
        name: 'Ada',
        company: 'Analytical',
        uid: USER_UID,
        id: 7,
        documentId: 'user-1',
        roles: [
          { documentId: 'role-a', name: 'Editors', type: 'custom' },
          { documentId: 'role-b', name: 'Authenticated', type: 'authenticated' },
        ],
      });
      expect(documents).toHaveBeenCalledWith(USER_UID);
      expect(findFirst).toHaveBeenCalledWith({
        filters: { $and: [{ documentId: 'user-1' }, userQuery] },
        populate: { roles: { fields: ['documentId', 'name', 'type'] } },
      });
    });

    it('loads their profile only when asked, which is what a condition that reads it is previewed with', async () => {
      const { ability, findFirst, findProfile } = setup();

      findFirst.mockResolvedValue({ id: 7, documentId: 'user-1', email: 'a@b.c' });
      findProfile.mockResolvedValue({ documentId: 'profile-1', plan: 'pro' });

      await expect(ability.conditionUserFor('user-1', {})).resolves.not.toHaveProperty('profile');
      expect(findProfile).not.toHaveBeenCalled();

      await expect(
        ability.conditionUserFor('user-1', {}, { profile: true })
      ).resolves.toMatchObject({ profile: { documentId: 'profile-1', plan: 'pro' } });
      expect(findProfile).toHaveBeenCalledTimes(1);
    });

    it('is a user with no roles when they hold none', async () => {
      const { ability, findFirst } = setup();

      findFirst.mockResolvedValueOnce({ id: 7, documentId: 'user-1', email: 'a@b.c' });

      await expect(ability.conditionUserFor('user-1', {})).resolves.toMatchObject({
        documentId: 'user-1',
        roles: [],
      });
    });

    it('is a NotFoundError when there is no such user, or the admin cannot see them', async () => {
      const { ability } = setup();

      await expect(ability.conditionUserFor('user-1', userQuery)).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'User not found',
      });
    });
  });

  describe('describe', () => {
    it("is core's description of the caller with the roles a signed-in user holds", async () => {
      const { ability, describePermissions } = setup();
      const auth = {
        strategy: { name: 'end-users' },
        credentials: {
          documentId: 'user-1',
          roles: [
            { documentId: 'role-a', name: 'Authenticated', type: 'authenticated' },
            { documentId: 'role-b', name: 'Editors', type: 'custom' },
          ],
        },
        ability: {},
      };

      expect(await ability.describe(auth)).toEqual({
        roles: [
          { documentId: 'role-a', name: 'Authenticated', type: 'authenticated' },
          { documentId: 'role-b', name: 'Editors', type: 'custom' },
        ],
        routes: ['plugin::end-users.me.find'],
        subjects: { 'plugin::end-users.profile': {} },
      });
      expect(describePermissions).toHaveBeenCalledWith(auth);
    });

    it('gives Public the Public role, from the same lookup as its ability', async () => {
      const { ability, findPublic } = setup();

      await ability.forUser(null, []);

      const described = await ability.describe({ credentials: null, ability: {} });

      expect(described.roles).toEqual([
        { documentId: 'role-public', name: 'Public', type: 'public' },
      ]);
      // Found once: the request's ability already looked it up
      expect(findPublic).toHaveBeenCalledTimes(1);
    });

    it('gives Public no role when there is no Public role yet', async () => {
      const { ability, findPublic } = setup();
      findPublic.mockResolvedValue(null);

      expect((await ability.describe({ credentials: null, ability: {} })).roles).toEqual([]);
    });

    it('copies only the documentId, name and type of each role', async () => {
      const { ability } = setup();

      const described = await ability.describe({
        credentials: {
          roles: [{ documentId: 'role-a', name: 'A', type: 'custom', requireTwoFactor: true }],
        },
        ability: {},
      });

      expect(described.roles).toEqual([{ documentId: 'role-a', name: 'A', type: 'custom' }]);
    });
  });

  describe('the cache of role permissions', () => {
    const A = { documentId: 'role-a' };
    const B = { documentId: 'role-b' };

    it('reads a role once and answers the next requests from memory', async () => {
      const { ability, findForRoles } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      await ability.forUser(USER, [A]);
      await ability.forUser(USER, [A]);
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(1);
    });

    it('is keyed by role: a second role is read alone, the first stays in memory', async () => {
      const { ability, findForRoles } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
        { roleDocumentId: 'role-b', action: 'api::note.note.findOne' },
      ]);

      await ability.forUser(USER, [A]);
      await ability.forUser(USER, [A, B]);

      expect(findForRoles).toHaveBeenNthCalledWith(1, ['role-a']);
      expect(findForRoles).toHaveBeenNthCalledWith(2, ['role-b']);
      expect(findForRoles).toHaveBeenCalledTimes(2);
    });

    it('shares what it read between users with the same role', async () => {
      const { ability, findForRoles } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      await ability.forUser({ documentId: 'user-1' }, [A]);
      await ability.forUser({ documentId: 'user-2' }, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(1);
    });

    it('keeps a role with no permissions too, so it is not asked for on every request', async () => {
      const { ability, findForRoles } = setup();

      await ability.forUser(USER, [A]);
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(1);
    });

    it('reads a role again after 30 seconds', async () => {
      const { ability, findForRoles, table, lastActions } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      expect(PERMISSIONS_TTL_MS).toBe(30_000);

      await ability.forUser(USER, [A]);

      table.push(row('role-a', 'api::note.note.findOne'));

      // Another instance wrote it: this one does not know, and goes on serving what it has
      vi.advanceTimersByTime(PERMISSIONS_TTL_MS - 1);
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(1);
      expect(lastActions()).toEqual(['api::note.note.find']);

      vi.advanceTimersByTime(1);
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(2);
      expect(lastActions().sort()).toEqual(['api::note.note.find', 'api::note.note.findOne']);
    });

    it('reads again after invalidate()', async () => {
      const { ability, findForRoles, table, lastActions } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      await ability.forUser(USER, [A]);
      table.length = 0;
      ability.invalidate();
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(2);
      expect(lastActions()).toEqual([]);
    });

    it('does not keep what a read that was under way during an invalidation found', async () => {
      const { ability, findForRoles, table, lastActions } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      let release: () => void = () => {};
      const before = table.filter(({ roleDocumentId }) => roleDocumentId === 'role-a');

      // The first read starts, is overtaken by a write and its invalidation, and only then returns
      // what the database held before the write
      findForRoles.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve([...before]);
          })
      );

      const inFlight = ability.forUser(USER, [A]);

      table.push(row('role-a', 'api::note.note.findOne'));
      ability.invalidate();
      release();
      await inFlight;

      // That answer was not put in the cache: the next request reads the table again
      await ability.forUser(USER, [A]);

      expect(findForRoles).toHaveBeenCalledTimes(2);
      expect(lastActions().sort()).toEqual(['api::note.note.find', 'api::note.note.findOne']);
    });

    it('does not keep the Public role across an invalidation', async () => {
      const { ability, findPublic } = setup();

      await ability.forUser(null, []);
      ability.invalidate();
      await ability.forUser(null, []);

      expect(findPublic).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidation on write', () => {
    it('listens to the writes of the permissions and of the roles', () => {
      const { subscriberFor } = setup();

      expect(subscriberFor(PERMISSION_UID)).toBeDefined();
      expect(subscriberFor(ROLE_UID)).toBeDefined();
    });

    it.each([
      'afterCreate',
      'afterCreateMany',
      'afterUpdate',
      'afterUpdateMany',
      'afterDelete',
      'afterDeleteMany',
    ])('forgets the cached permissions on a permission %s', async (event) => {
      const { ability, findForRoles, subscriberFor, fire } = setup([
        { roleDocumentId: 'role-a', action: 'api::note.note.find' },
      ]);

      await ability.forUser(USER, [{ documentId: 'role-a' }]);
      fire(subscriberFor(PERMISSION_UID), event);
      await ability.forUser(USER, [{ documentId: 'role-a' }]);

      expect(findForRoles).toHaveBeenCalledTimes(2);
    });

    it.each(['afterUpdate', 'afterUpdateMany', 'afterDelete', 'afterDeleteMany'])(
      'forgets the cached permissions on a role %s',
      async (event) => {
        const { ability, findForRoles, subscriberFor, fire } = setup([
          { roleDocumentId: 'role-a', action: 'api::note.note.find' },
        ]);

        await ability.forUser(USER, [{ documentId: 'role-a' }]);
        fire(subscriberFor(ROLE_UID), event);
        await ability.forUser(USER, [{ documentId: 'role-a' }]);

        expect(findForRoles).toHaveBeenCalledTimes(2);
      }
    );

    it('does not forget anything when a role is created: a new role has nothing cached', () => {
      const { subscriberFor } = setup();

      expect(subscriberFor(ROLE_UID)).not.toHaveProperty('afterCreate');
      expect(subscriberFor(ROLE_UID)).not.toHaveProperty('afterCreateMany');
    });
  });
});
