import { describe, expect, it, vi } from 'vitest';
import { runWithEndpointContext } from '@better-auth/core/context';
import type { Core } from '@strapi/types';

import { pendingLinkIdentifier, pendingLinkPrefix } from '../../../utils/pending-link';
import { pendingLink } from '../plugins/pending-link';

/**
 * The plugin on its own: the provider's `getUserInfo` it wraps, the request's context it trusts the
 * provider in, and the account hooks that spend the link. Better Auth's own linking, and the whole
 * sign-in, are in `tests/api/plugins/end-users/migration/provider-link.test.api.ts`.
 */

const USER = { id: 'user-1', email: 'erin@example.com', emailVerified: true };
const LINK = {
  id: 'link-1',
  identifier: pendingLinkIdentifier('keycloak', USER.email),
  value: USER.id,
  expiresAt: new Date(Date.now() + 60_000),
};

type Link = typeof LINK | null;
type User = { id: string; email: string; emailVerified: boolean | null } | null;

const fakeStrapi = () => ({ log: { warn: vi.fn() } }) as unknown as Core.Strapi;

/**
 * A request's auth context: the trusted providers, the stored link and the stored user. `shared`
 * is the list the context started with, which every request would share.
 */
const requestContext = ({ link = LINK as Link, user = USER as User } = {}) => {
  const shared: string[] = [];

  return {
    shared,
    auth: {
      trustedProviders: shared,
      adapter: {
        findOne: vi.fn(async ({ where }: { where: Array<{ value: string }> }) =>
          link && where[0].value === link.identifier ? link : null
        ),
        deleteMany: vi.fn(async () => 1),
      },
      internalAdapter: {
        findUserById: vi.fn(async (id: string) => (user && id === user.id ? user : null)),
      },
    } as Record<string, any>,
  };
};

/** A provider whose `getUserInfo` answers with this user */
const providerAnswering = (id: string, user: Record<string, unknown>) => ({
  id,
  getUserInfo: vi.fn(async () => ({ user, data: {} })),
});

/** The plugin, initialized on a context with these providers, and its account hooks */
const install = (providers: unknown[], strapi = fakeStrapi()) => {
  const adapter = { deleteMany: vi.fn(async () => 1) };
  const plugin = pendingLink(strapi);
  const result = (plugin.init as (context: unknown) => any)({
    socialProviders: providers,
    adapter,
  });

  return { plugin, strapi, adapter, hooks: result.options.databaseHooks.account.create };
};

/** The provider's user lookup, run inside a request with this context */
const lookUp = (auth: Record<string, any>, provider: { getUserInfo: () => Promise<unknown> }) =>
  runWithEndpointContext({ context: auth } as never, () => provider.getUserInfo());

describe('pending-link', () => {
  it('trusts the provider in this request alone when a pending link holds the address it answered with', async () => {
    const answer = { email: 'Erin@Example.com', emailVerified: false };
    const provider = providerAnswering('keycloak', answer);
    const { auth, shared } = requestContext();

    install([provider]);

    // The user info goes on to Better Auth as the provider sent it
    await expect(lookUp(auth, provider)).resolves.toEqual({ user: answer, data: {} });
    expect(auth.trustedProviders).toEqual(['keycloak']);
    // A new list on this request's context: the list every request shares is left as it was
    expect(shared).toEqual([]);
    expect(auth.adapter.findOne).toHaveBeenCalledWith({
      model: 'verification',
      where: [
        { field: 'identifier', value: pendingLinkIdentifier('keycloak', 'erin@example.com') },
      ],
    });
  });

  it('leaves an address the provider calls verified to Better Auth`s own rule', async () => {
    const provider = providerAnswering('keycloak', { email: USER.email, emailVerified: true });
    const { auth } = requestContext();

    install([provider]);
    await lookUp(auth, provider);

    expect(auth.trustedProviders).toEqual([]);
    expect(auth.adapter.findOne).not.toHaveBeenCalled();
  });

  it('trusts nothing for another provider, or an address with no pending link', async () => {
    for (const [id, email] of [
      ['other-idp', USER.email],
      ['keycloak', 'someone@example.com'],
    ]) {
      const provider = providerAnswering(id, { email });
      const { auth } = requestContext();

      install([provider]);
      // eslint-disable-next-line no-await-in-loop
      await lookUp(auth, provider);

      expect(auth.trustedProviders, `${id} ${email}`).toEqual([]);
    }
  });

  it('trusts nothing when the user is gone, has another address, never confirmed theirs, or the link ran out', async () => {
    const cases: Array<{ link?: Link; user?: User }> = [
      { user: null },
      { user: { ...USER, email: 'erin.new@example.com' } },
      { user: { ...USER, emailVerified: false } },
      { user: { ...USER, emailVerified: null } },
      { link: { ...LINK, expiresAt: new Date(Date.now() - 1000) } },
    ];

    for (const state of cases) {
      const provider = providerAnswering('keycloak', { email: USER.email });
      const { auth } = requestContext(state);
      const { hooks } = install([provider]);

      // eslint-disable-next-line no-await-in-loop
      await lookUp(auth, provider);

      expect(auth.trustedProviders, JSON.stringify(state)).toEqual([]);
      // And no grant: the account Better Auth would make is not a pending link's
      // eslint-disable-next-line no-await-in-loop
      await expect(
        hooks.before({ userId: USER.id, providerId: 'keycloak' }, { context: auth })
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).not.toHaveBeenCalled();
    }
  });

  it('trusts nothing outside a request', async () => {
    const provider = providerAnswering('keycloak', { email: USER.email });

    install([provider]);

    await expect(provider.getUserInfo()).resolves.toMatchObject({ user: { email: USER.email } });
  });

  it('decides without the link when it cannot be read', async () => {
    const provider = providerAnswering('keycloak', { email: USER.email });
    const { auth } = requestContext();
    const { strapi } = install([provider]);

    auth.adapter.findOne.mockRejectedValueOnce(new Error('the database is gone'));

    await expect(lookUp(auth, provider)).resolves.toMatchObject({ user: { email: USER.email } });
    expect(auth.trustedProviders).toEqual([]);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('the database is gone'));
  });

  it('wraps each provider once, and one a later request finds', async () => {
    const first = providerAnswering('keycloak', { email: USER.email });
    const later = providerAnswering('late-idp', { email: USER.email });
    const original = first.getUserInfo;
    const laterOriginal = later.getUserInfo;
    const { plugin } = install([first]);

    expect(first.getUserInfo).not.toBe(original);
    expect(later.getUserInfo).toBe(laterOriginal);

    // The before hook runs on the provider endpoints, with the providers the request sees
    const [hook] = plugin.hooks!.before!;

    expect(hook.matcher({ path: '/callback/:id' } as never)).toBe(true);
    expect(hook.matcher({ path: '/sign-in/social' } as never)).toBe(true);
    expect(hook.matcher({ path: '/get-session' } as never)).toBe(false);

    await (hook.handler as unknown as (ctx: unknown) => Promise<void>)({
      context: { socialProviders: [first, later] },
    });

    expect(later.getUserInfo).not.toBe(laterOriginal);

    const wrapped = first.getUserInfo;

    install([first]);

    expect(first.getUserInfo).toBe(wrapped);
  });

  describe('the account it makes', () => {
    /** A request in which the provider was trusted for USER's pending link */
    const granted = async () => {
      const provider = providerAnswering('keycloak', { email: USER.email });
      const { auth } = requestContext();
      const { hooks } = install([provider]);

      await lookUp(auth, provider);

      return { auth, hooks, ctx: { context: auth } };
    };

    it('spends the link with the one account it was for', async () => {
      const { auth, hooks, ctx } = await granted();

      await expect(
        hooks.before({ userId: USER.id, providerId: 'keycloak' }, ctx)
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).toHaveBeenCalledWith({
        model: 'verification',
        where: [{ field: 'id', value: LINK.id }],
      });

      // Spent: another account in the same request is not a pending link's
      await expect(
        hooks.before({ userId: USER.id, providerId: 'keycloak' }, ctx)
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('refuses an account of the provider for any other user in that request', async () => {
      const { auth, hooks, ctx } = await granted();

      await expect(hooks.before({ userId: 'user-2', providerId: 'keycloak' }, ctx)).resolves.toBe(
        false
      );
      expect(auth.adapter.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses the account when another request spent the link first', async () => {
      const { auth, hooks, ctx } = await granted();

      auth.adapter.deleteMany.mockResolvedValueOnce(0);

      await expect(hooks.before({ userId: USER.id, providerId: 'keycloak' }, ctx)).resolves.toBe(
        false
      );
    });

    it('leaves the accounts of other providers alone', async () => {
      const { auth, hooks, ctx } = await granted();

      await expect(
        hooks.before({ userId: USER.id, providerId: 'credential' }, ctx)
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).not.toHaveBeenCalled();
    });

    it('removes the user`s pending link of a provider once they have its account, whatever made it', async () => {
      const { adapter, hooks, strapi } = install([]);

      await hooks.after({ userId: USER.id, providerId: 'keycloak' });

      expect(adapter.deleteMany).toHaveBeenCalledWith({
        model: 'verification',
        where: [
          { field: 'value', value: USER.id },
          { field: 'identifier', value: pendingLinkPrefix('keycloak'), operator: 'starts_with' },
        ],
      });

      adapter.deleteMany.mockRejectedValueOnce(new Error('the database is gone'));

      await expect(hooks.after({ userId: USER.id, providerId: 'keycloak' })).resolves.toBe(
        undefined
      );
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('the database is gone'));
    });
  });
});
