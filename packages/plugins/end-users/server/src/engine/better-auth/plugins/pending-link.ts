/**
 * `pending-link`: a user who signed up with a provider under Users & Permissions is linked to it on
 * their first sign-in with it, once.
 *
 * Users & Permissions never stored the provider's account id, so the migration has no account row
 * to write for those users and records a pending link instead (`utils/pending-link`). Better Auth
 * links a provider sign-in to an existing account only when the provider says the address is
 * verified or the provider is trusted for linking (`oauth2/link-account.mjs`, `handleOAuthUserInfo`),
 * and Facebook, X, VK and others never say so: without the link, those users could not sign in with
 * their provider after the move.
 *
 * The decision needs the address the provider answered with, which Better Auth has only once the
 * provider's `getUserInfo` returns; so `getUserInfo` is wrapped. When the address is not called
 * verified, and a pending link of that provider holds it for a user who still has it and whose own
 * address is confirmed, the provider is trusted for linking in this request only: the request's own
 * copy of the context gets it in `trustedProviders`, as the admin's "trust for linking" puts it
 * there for every request. Better Auth then links as it would for a trusted provider, with its other
 * checks (the user's own address confirmed, linking not turned off, the ban when the session is
 * made) as they are. The account that the link makes spends it, and only that account may: an
 * account of the provider for any other user in the same request is refused. Any other case (another
 * provider, another address, no pending link, a link already spent) gets Better Auth's rule.
 *
 * An account of the provider that the user gets any other way (a verified address, a trusted
 * provider, linking it while signed in) also spends the link, so it never outlives its purpose.
 */
import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { tryGetCurrentAuthEndpointContext } from '@better-auth/core/context';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import { normalizeEmail } from '../../../utils/normalize-email';
import { pendingLinkIdentifier, pendingLinkPrefix } from '../../../utils/pending-link';

/** Marks a provider whose `getUserInfo` is wrapped, so it is wrapped once */
const WRAPPED = Symbol.for('strapi.end-users.pending-link');

/** The request's grant, kept on the request's own copy of the auth context */
const GRANT = Symbol.for('strapi.end-users.pending-link.grant');

/** The endpoints where a provider answers with the user: the callbacks and the ID token sign-in */
const PROVIDER_SIGN_IN_PATH =
  /(^|\/)(oauth2\/callback|callback|sign-in\/social|sign-in\/oauth2)(\/|$)/;

interface Grant {
  providerId: string;
  userId: string;
  /** The id of the pending link's row */
  linkId: string;
}

interface ProviderUser {
  email?: unknown;
  emailVerified?: unknown;
}

interface Provider {
  id: string;
  getUserInfo?: (...args: unknown[]) => Promise<{ user?: ProviderUser } | null>;
  [WRAPPED]?: true;
}

type AuthContext = NonNullable<ReturnType<typeof tryGetCurrentAuthEndpointContext>>['context'] & {
  [GRANT]?: Grant;
};

interface StoredLink {
  id: string;
  value: string;
  expiresAt: Date | string;
}

interface StoredUser {
  id: string;
  email: string;
  emailVerified?: boolean | null;
}

/**
 * Trusts `providerId` for linking in this request when a pending link holds the address it
 * answered with, for a user who still has that address and has confirmed it. A lookup that fails
 * trusts nothing: the sign-in then gets Better Auth's own rule.
 */
const trustForPendingLink = async (strapi: Core.Strapi, providerId: string, user: ProviderUser) => {
  // A verified address is linked by Better Auth's own rule
  if (user.emailVerified === true || typeof user.email !== 'string' || user.email === '') {
    return;
  }

  const auth = tryGetCurrentAuthEndpointContext()?.context as AuthContext | undefined;

  if (!auth || auth.trustedProviders.includes(providerId)) {
    return;
  }

  const email = normalizeEmail(user.email);

  try {
    const link = (await auth.adapter.findOne({
      model: 'verification',
      where: [{ field: 'identifier', value: pendingLinkIdentifier(providerId, email) }],
    })) as StoredLink | null;

    if (!link || new Date(link.expiresAt).getTime() <= Date.now()) {
      return;
    }

    const owner = (await auth.internalAdapter.findUserById(link.value)) as StoredUser | null;

    if (!owner || normalizeEmail(owner.email) !== email || owner.emailVerified !== true) {
      return;
    }

    auth[GRANT] = { providerId, userId: owner.id, linkId: link.id };
    // Assigned, never pushed: the array may be the one every request shares
    auth.trustedProviders = [...auth.trustedProviders, providerId];
  } catch (error) {
    strapi.log.warn(
      `${PLUGIN_ID}: the pending link of a ${providerId} sign-in could not be read ` +
        `(${(error as Error)?.message ?? String(error)}); the sign-in is decided without it.`
    );
  }
};

/** Wraps each provider's `getUserInfo`, once */
const wrapProviders = (strapi: Core.Strapi, providers: unknown) => {
  if (!Array.isArray(providers)) {
    return;
  }

  for (const provider of providers as Provider[]) {
    if (
      typeof provider !== 'object' ||
      provider === null ||
      provider[WRAPPED] ||
      typeof provider.getUserInfo !== 'function'
    ) {
      continue;
    }

    const original = provider.getUserInfo;

    provider.getUserInfo = async function getUserInfo(this: unknown, ...args: unknown[]) {
      const info = await original.apply(this, args);

      if (info?.user) {
        await trustForPendingLink(strapi, provider.id, info.user);
      }

      return info;
    };
    provider[WRAPPED] = true;
  }
};

export const pendingLink = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'pending-link',

  // Installed after the generic OAuth plugin, whose providers its own `init` adds
  init(context) {
    wrapProviders(strapi, context.socialProviders);

    return {
      options: {
        databaseHooks: {
          account: {
            create: {
              async before(account: { userId: string; providerId: string }, ctx) {
                const auth = ctx?.context as AuthContext | undefined;
                const grant = auth?.[GRANT];

                if (!auth || !grant || account.providerId !== grant.providerId) {
                  return undefined;
                }

                // The trust was for this one user's link: spent by it, refused for anyone else
                delete auth[GRANT];

                if (account.userId !== grant.userId) {
                  return false;
                }

                // One conditional delete: of two requests that got the same grant, one links
                const spent = await auth.adapter.deleteMany({
                  model: 'verification',
                  where: [{ field: 'id', value: grant.linkId }],
                });

                return spent === 1 ? undefined : false;
              },
              async after(account: { userId: string; providerId: string }) {
                try {
                  await context.adapter.deleteMany({
                    model: 'verification',
                    where: [
                      { field: 'value', value: account.userId },
                      {
                        field: 'identifier',
                        value: pendingLinkPrefix(account.providerId),
                        operator: 'starts_with',
                      },
                    ],
                  });
                } catch (error) {
                  strapi.log.warn(
                    `${PLUGIN_ID}: the pending link of user ${account.userId} for ` +
                      `${account.providerId} could not be removed ` +
                      `(${(error as Error)?.message ?? String(error)}).`
                  );
                }
              },
            },
          },
        },
      },
    };
  },

  hooks: {
    before: [
      {
        // A provider the generic OAuth plugin could only build on a later request (its discovery
        // failed at the start) is wrapped when it is first used
        matcher: (context) => PROVIDER_SIGN_IN_PATH.test(String(context.path ?? '')),
        handler: createAuthMiddleware(async (ctx) => {
          wrapProviders(strapi, ctx.context.socialProviders);
        }),
      },
    ],
  },
});
