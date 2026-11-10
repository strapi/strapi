import { describe, expect, it, vi } from 'vitest';
import { runWithEndpointContext } from '@better-auth/core/context';
import type { Core } from '@strapi/types';

import {
  PROVIDERS_WITHOUT_EMAIL_VERIFICATION,
  pendingLinkIdentifier,
  pendingLinkPrefix,
} from '../../../utils/pending-link';
import { pendingLink } from '../plugins/pending-link';

/**
 * The plugin on its own: the providers whose `getUserInfo` it wraps, the request's context it trusts
 * the provider in, and the account hooks that spend the link. Better Auth's own linking, and the
 * whole sign-in, are in `tests/api/plugins/end-users/migration/provider-link.test.api.ts`.
 */

const USER = {
  id: 'user-1',
  email: 'erin@example.com',
  emailVerified: true,
  banned: false,
  banExpires: null,
};
const LINK = {
  id: 'link-1',
  identifier: pendingLinkIdentifier('facebook', USER.email),
  value: USER.id,
  expiresAt: new Date(Date.now() + 60_000),
};

type Link = typeof LINK | null;
type User = Record<string, unknown> | null;

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

/** A provider whose `getUserInfo` answers with this user and this profile of its own */
const providerAnswering = (
  id: string,
  user: Record<string, unknown>,
  data: Record<string, unknown> = { id: 'fb-1' }
) => ({
  id,
  getUserInfo: vi.fn(async () => ({ user, data })),
});

/** What Better Auth's Facebook mapper answers: never verified, and no claim in the profile */
const facebookAnswer = (email = 'Erin@Example.com') => ({ email, emailVerified: false });

/** The plugin, initialized on a context with these providers, and its account hooks */
const install = (
  providers: unknown[],
  socialProviderIds: readonly string[] = ['facebook', 'github', 'keycloak'],
  strapi = fakeStrapi()
) => {
  const adapter = { deleteMany: vi.fn(async () => 1) };
  const plugin = pendingLink(strapi, socialProviderIds);
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
  it('lists the built-in social providers that never assert a verified address, and not X', () => {
    expect(PROVIDERS_WITHOUT_EMAIL_VERIFICATION).toEqual([
      'facebook',
      'vk',
      'line',
      'tiktok',
      'notion',
      'spotify',
    ]);
  });

  it('trusts the provider in this request alone when a pending link holds the address it answered with', async () => {
    const answer = facebookAnswer();
    const provider = providerAnswering('facebook', answer);
    const { auth, shared } = requestContext();

    install([provider]);

    // The user info goes on to Better Auth as the provider sent it
    await expect(lookUp(auth, provider)).resolves.toEqual({ user: answer, data: { id: 'fb-1' } });
    expect(auth.trustedProviders).toEqual(['facebook']);
    // A new list on this request's context: the list every request shares is left as it was
    expect(shared).toEqual([]);
    expect(auth.adapter.findOne).toHaveBeenCalledWith({
      model: 'verification',
      where: [
        { field: 'identifier', value: pendingLinkIdentifier('facebook', 'erin@example.com') },
      ],
    });
  });

  it('never overrules a provider that answers whether the address is verified, false included', async () => {
    for (const data of [
      { id: 'fb-1', email_verified: false },
      { id: 'fb-1', emailVerified: false },
      { id: 'fb-1', verified_email: false },
      { id: 'fb-1', email_verified: null },
    ]) {
      const provider = providerAnswering('facebook', facebookAnswer(), data);
      const { auth } = requestContext();

      install([provider]);
      // eslint-disable-next-line no-await-in-loop
      await lookUp(auth, provider);

      expect(auth.trustedProviders, JSON.stringify(data)).toEqual([]);
      expect(auth.adapter.findOne).not.toHaveBeenCalled();
    }
  });

  it('leaves an address the provider calls verified to Better Auth`s own rule', async () => {
    const provider = providerAnswering('facebook', { email: USER.email, emailVerified: true });
    const { auth } = requestContext();

    install([provider]);
    await lookUp(auth, provider);

    expect(auth.trustedProviders).toEqual([]);
    expect(auth.adapter.findOne).not.toHaveBeenCalled();
  });

  it('wraps only the listed built-in social providers, never a generic one or one a generic one shadows', () => {
    const facebook = providerAnswering('facebook', facebookAnswer());
    const github = providerAnswering('github', facebookAnswer());
    const keycloak = providerAnswering('keycloak', facebookAnswer());
    const originals = [facebook, github, keycloak].map((provider) => provider.getUserInfo);

    // `keycloak` is a generic provider: not among the social ids the engine passes
    install([facebook, github, keycloak], ['facebook', 'github']);

    expect(facebook.getUserInfo).not.toBe(originals[0]);
    expect(github.getUserInfo).toBe(originals[1]);
    expect(keycloak.getUserInfo).toBe(originals[2]);

    // A generic provider with the id of a listed one: the engine leaves the id out
    const shadow = providerAnswering('spotify', facebookAnswer());
    const shadowed = shadow.getUserInfo;

    install([shadow], ['facebook']);

    expect(shadow.getUserInfo).toBe(shadowed);
  });

  it('trusts nothing for an address with no pending link', async () => {
    const provider = providerAnswering('facebook', facebookAnswer('someone@example.com'));
    const { auth } = requestContext();

    install([provider]);
    await lookUp(auth, provider);

    expect(auth.trustedProviders).toEqual([]);
  });

  it('trusts nothing when the user is gone, has another address, never confirmed theirs, is banned, or the link ran out', async () => {
    const cases: Array<{ link?: Link; user?: User }> = [
      { user: null },
      { user: { ...USER, email: 'erin.new@example.com' } },
      { user: { ...USER, emailVerified: false } },
      { user: { ...USER, emailVerified: null } },
      { user: { ...USER, banned: true } },
      { user: { ...USER, banned: true, banExpires: new Date(Date.now() + 60_000) } },
      { link: { ...LINK, expiresAt: new Date(Date.now() - 1000) } },
    ];

    for (const state of cases) {
      const provider = providerAnswering('facebook', facebookAnswer());
      const { auth } = requestContext(state);
      const { hooks } = install([provider]);

      // eslint-disable-next-line no-await-in-loop
      await lookUp(auth, provider);

      expect(auth.trustedProviders, JSON.stringify(state)).toEqual([]);
      // And no grant: the account Better Auth would make is not a pending link's
      // eslint-disable-next-line no-await-in-loop
      await expect(
        hooks.before({ userId: USER.id, providerId: 'facebook' }, { context: auth })
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).not.toHaveBeenCalled();
    }
  });

  it('trusts a user whose ban has run out', async () => {
    const provider = providerAnswering('facebook', facebookAnswer());
    const { auth } = requestContext({
      user: { ...USER, banned: true, banExpires: new Date(Date.now() - 60_000) },
    });

    install([provider]);
    await lookUp(auth, provider);

    expect(auth.trustedProviders).toEqual(['facebook']);
  });

  it('trusts nothing outside a request', async () => {
    const provider = providerAnswering('facebook', facebookAnswer());

    install([provider]);

    await expect(provider.getUserInfo()).resolves.toMatchObject({ user: { emailVerified: false } });
  });

  it('decides without the link when it cannot be read', async () => {
    const provider = providerAnswering('facebook', facebookAnswer());
    const { auth } = requestContext();
    const { strapi } = install([provider]);

    auth.adapter.findOne.mockRejectedValueOnce(new Error('the database is gone'));

    await expect(lookUp(auth, provider)).resolves.toMatchObject({
      user: { email: 'Erin@Example.com' },
    });
    expect(auth.trustedProviders).toEqual([]);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('the database is gone'));
  });

  it('wraps a provider once, however often the engine is built over it', () => {
    const provider = providerAnswering('facebook', facebookAnswer());

    install([provider]);

    const wrapped = provider.getUserInfo;

    install([provider]);

    expect(provider.getUserInfo).toBe(wrapped);
  });

  describe('the account it makes', () => {
    /** A request in which the provider was trusted for USER's pending link */
    const granted = async () => {
      const provider = providerAnswering('facebook', facebookAnswer());
      const { auth } = requestContext();
      const { hooks } = install([provider]);

      await lookUp(auth, provider);

      return { auth, hooks, ctx: { context: auth } };
    };

    it('spends the link with the one account it was for', async () => {
      const { auth, hooks, ctx } = await granted();

      await expect(
        hooks.before({ userId: USER.id, providerId: 'facebook' }, ctx)
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).toHaveBeenCalledWith({
        model: 'verification',
        where: [{ field: 'id', value: LINK.id }],
      });

      // Spent: another account in the same request is not a pending link's
      await expect(
        hooks.before({ userId: USER.id, providerId: 'facebook' }, ctx)
      ).resolves.toBeUndefined();
      expect(auth.adapter.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('refuses an account of the provider for any other user in that request', async () => {
      const { auth, hooks, ctx } = await granted();

      await expect(hooks.before({ userId: 'user-2', providerId: 'facebook' }, ctx)).resolves.toBe(
        false
      );
      expect(auth.adapter.deleteMany).not.toHaveBeenCalled();
    });

    it('refuses the account when another request spent the link first', async () => {
      const { auth, hooks, ctx } = await granted();

      auth.adapter.deleteMany.mockResolvedValueOnce(0);

      await expect(hooks.before({ userId: USER.id, providerId: 'facebook' }, ctx)).resolves.toBe(
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

      await hooks.after({ userId: USER.id, providerId: 'facebook' });

      expect(adapter.deleteMany).toHaveBeenCalledWith({
        model: 'verification',
        where: [
          { field: 'value', value: USER.id },
          { field: 'identifier', value: pendingLinkPrefix('facebook'), operator: 'starts_with' },
        ],
      });

      adapter.deleteMany.mockRejectedValueOnce(new Error('the database is gone'));

      await expect(hooks.after({ userId: USER.id, providerId: 'facebook' })).resolves.toBe(
        undefined
      );
      expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('the database is gone'));
    });
  });
});
