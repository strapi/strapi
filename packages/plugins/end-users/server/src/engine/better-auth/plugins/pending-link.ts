/**
 * `pending-link`: a user who signed up under Users & Permissions with a provider that never asserts
 * a verified address is linked to it on their first sign-in with it, once.
 *
 * Users & Permissions never stored the provider's account id, so the migration has no account row
 * to write for those users and records a pending link instead (`utils/pending-link`). Better Auth
 * links a provider sign-in to an existing account only when the provider says the address is
 * verified or the provider is trusted for linking (`oauth2/link-account.mjs`, `handleOAuthUserInfo`),
 * and the providers of `PROVIDERS_WITHOUT_EMAIL_VERIFICATION` never say so: without the link, those
 * users could not sign in with their provider after the move.
 *
 * The decision needs the address the provider answered with, which Better Auth has only once the
 * provider's `getUserInfo` returns; so `getUserInfo` is wrapped, for those built-in social providers
 * only. A generic OAuth or OpenID Connect provider is never wrapped. The provider is trusted for
 * linking in this request only (the request's own copy of the context gets it in
 * `trustedProviders`, where the admin's "trust for linking" puts it for every request) when all of
 * these hold:
 *
 * - its answer carries no claim about the address being verified, not even `false`;
 * - a pending link of that provider holds the address it answered with;
 * - the user of the link still has that address, has confirmed it, and is not banned.
 *
 * Better Auth then links as it would for a trusted provider, with its other checks as they are. The
 * account that the link makes spends it, and only that account may: an account of the provider for
 * any other user in the same request is refused. Any other case gets Better Auth's rule.
 *
 * An account of the provider that the user gets any other way (linking it while signed in, an
 * administrator trusting the provider) also spends the link, so it never outlives its purpose.
 */
import type { BetterAuthPlugin } from 'better-auth';
import { tryGetCurrentAuthEndpointContext } from '@better-auth/core/context';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../../constants';
import { banState } from '../../../utils/ban';
import { normalizeEmail } from '../../../utils/normalize-email';
import {
  PROVIDERS_WITHOUT_EMAIL_VERIFICATION,
  pendingLinkIdentifier,
  pendingLinkPrefix,
  pendingLinkSecret,
} from '../../../utils/pending-link';

/** Marks a provider whose `getUserInfo` is wrapped, so it is wrapped once */
const WRAPPED = Symbol.for('strapi.end-users.pending-link');

/** The request's grant, kept on the request's own copy of the auth context */
const GRANT = Symbol.for('strapi.end-users.pending-link.grant');

/**
 * The names a provider's profile gives the claim that the address is verified. An answer with any
 * of them, whatever its value, is a provider that decided: a `false` is never overruled.
 */
const VERIFICATION_CLAIMS = ['email_verified', 'emailVerified', 'verified_email'];

interface Grant {
  providerId: string;
  userId: string;
  /** The id of the pending link's row */
  linkId: string;
}

interface ProviderAnswer {
  user?: { email?: unknown; emailVerified?: unknown };
  /** The provider's own profile, as it sent it */
  data?: unknown;
}

interface Provider {
  id: string;
  getUserInfo?: (...args: unknown[]) => Promise<ProviderAnswer | null>;
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
  banned?: unknown;
  banExpires?: unknown;
}

const claimsVerification = (profile: unknown): boolean =>
  typeof profile === 'object' &&
  profile !== null &&
  VERIFICATION_CLAIMS.some((claim) => Object.hasOwn(profile, claim));

/**
 * Trusts `providerId` for linking in this request when a pending link holds the address it
 * answered with, for a user who still has that address, has confirmed it and is not banned. A
 * lookup that fails trusts nothing: the sign-in then gets Better Auth's own rule.
 */
const trustForPendingLink = async (
  strapi: Core.Strapi,
  providerId: string,
  answer: ProviderAnswer,
  shared: unknown
) => {
  const { user } = answer;

  if (
    !user ||
    user.emailVerified === true ||
    claimsVerification(answer.data) ||
    typeof user.email !== 'string' ||
    user.email === ''
  ) {
    return;
  }

  const auth = tryGetCurrentAuthEndpointContext()?.context as AuthContext | undefined;

  // The context `init` received is the one every request shares: trusting a provider there would
  // trust it for all of them. Better Auth gives each request its own copy; should a version ever
  // run `auth.api.*` on the shared one, the grant fails closed.
  if (!auth || auth === shared || auth.trustedProviders.includes(providerId)) {
    return;
  }

  const email = normalizeEmail(user.email);

  try {
    const link = (await auth.adapter.findOne({
      model: 'verification',
      where: [
        {
          field: 'identifier',
          value: pendingLinkIdentifier(providerId, email, pendingLinkSecret(strapi)),
        },
      ],
    })) as StoredLink | null;

    if (!link || new Date(link.expiresAt).getTime() <= Date.now()) {
      return;
    }

    const owner = (await auth.internalAdapter.findUserById(link.value)) as StoredUser | null;

    if (
      !owner ||
      normalizeEmail(owner.email) !== email ||
      owner.emailVerified !== true ||
      banState(owner) === 'active'
    ) {
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

/** Wraps the `getUserInfo` of each provider of `ids`, once */
const wrapProviders = (
  strapi: Core.Strapi,
  providers: unknown,
  ids: ReadonlySet<string>,
  shared: unknown
) => {
  if (!Array.isArray(providers)) {
    return;
  }

  for (const provider of providers as Provider[]) {
    if (
      typeof provider !== 'object' ||
      provider === null ||
      !ids.has(provider.id) ||
      provider[WRAPPED] ||
      typeof provider.getUserInfo !== 'function'
    ) {
      continue;
    }

    const original = provider.getUserInfo;

    provider.getUserInfo = async function getUserInfo(this: unknown, ...args: unknown[]) {
      const answer = await original.apply(this, args);

      if (answer) {
        await trustForPendingLink(strapi, provider.id, answer, shared);
      }

      return answer;
    };
    provider[WRAPPED] = true;
  }
};

/**
 * `socialProviderIds`: the ids of the providers configured as Better Auth built-in social providers,
 * none of them shadowed by a generic OAuth provider of the same id. Of those, only the ones of
 * `PROVIDERS_WITHOUT_EMAIL_VERIFICATION` can spend a pending link.
 */
export const pendingLink = (
  strapi: Core.Strapi,
  socialProviderIds: readonly string[]
): BetterAuthPlugin => {
  const eligible = new Set(
    socialProviderIds.filter((id) => PROVIDERS_WITHOUT_EMAIL_VERIFICATION.includes(id))
  );

  return {
    id: 'pending-link',

    init(context) {
      // The provider objects Better Auth built from the social providers' config, before any
      // plugin installed after this one could add another provider under the same id
      wrapProviders(strapi, context.socialProviders, eligible, context);

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
                  // Only the listed providers have links: no delete for every other account made
                  if (!eligible.has(account.providerId)) {
                    return;
                  }

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
  };
};
