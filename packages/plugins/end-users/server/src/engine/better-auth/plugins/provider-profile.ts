/**
 * `provider-profile`: what a provider writes when a user signs in through it.
 *
 * Two things, both behind database hooks so they run for every way a provider sign-in ends up in
 * Better Auth (a social provider's callback, a generic OAuth callback, an ID token sign-in):
 *
 *   - the email guard. With "Update user details on each sign-in" on, Better Auth updates the user
 *     with everything the provider sent, the email included (`oauth2/link-account.mjs`), so a
 *     provider could move a user to another address, or call a different one verified, with no
 *     verification of the new address. A provider sign-in never changes `email`, and changes
 *     `emailVerified` only for the same address: Better Auth marks a verified address verified in a
 *     step of its own (the data of which carries no email), so what this drops is the combined
 *     update's copy of both. An email changes only through the verified change-email flow.
 *   - the every-sign-in profile mappings, written once the session exists. The sign-up mappings are
 *     written by `create-profile`, in the user's own create. A value the profile refuses is skipped
 *     and logged, and an error here never fails the sign-in: the profile is information, not a gate.
 *
 * The claims come from `provider-claims`, which the provider wrapper in `create-engine` fills while
 * Better Auth reads the user from the provider.
 */
import type { BetterAuthPlugin } from 'better-auth';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID } from '../../../constants';
import { readProviderClaims } from '../../../utils/provider-claims';
import type providerService from '../../../services/provider';
import { documentsOf, type PluginDocuments } from '../../../utils/typed-strapi';

/** The endpoints where a provider ends in a user being updated: the callbacks and the ID token one. */
const PROVIDER_SIGN_IN_PATH =
  /(^|\/)(oauth2\/callback|callback|sign-in\/social|sign-in\/oauth2)(\/|$)/;

export const providerProfile = (strapi: Core.Strapi): BetterAuthPlugin => ({
  id: 'provider-profile',

  init: () => ({
    options: {
      databaseHooks: {
        user: {
          update: {
            async before(data: Record<string, unknown>, context?: { path?: string } | null) {
              if (!('email' in data)) {
                return;
              }

              // Fails closed: the guard applies whenever the request has provider claims (the
              // provider wrapper left them while Better Auth read the user), not only on a path
              // this file knows. The path test is a second trigger, for a request without claims.
              // A `/link-social` that carries a profile update is guarded too, which is stricter
              // than the profile mapping alone needs: there the same-address verification is not upgraded either.
              if (
                !readProviderClaims(strapi) &&
                !PROVIDER_SIGN_IN_PATH.test(String(context?.path ?? ''))
              ) {
                return;
              }

              // A key set to `undefined` replaces the value of the update and is left out of the
              // write (the adapter skips it), so the stored address and flag stay as they are
              return { data: { email: undefined, emailVerified: undefined } };
            },
          },
        },
        session: {
          create: {
            async after(session: { userId: string }) {
              try {
                const claims = readProviderClaims(strapi);

                if (!claims) {
                  return;
                }

                const provider = strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<
                  typeof providerService
                >;
                const profile = (await documentsOf<PluginDocuments>(strapi, PROFILE_UID).findFirst({
                  filters: { user: { documentId: session.userId } },
                })) as { id?: number; documentId: string } | null;

                if (!profile) {
                  return;
                }

                const values = await provider.profileValues(
                  claims.providerId,
                  claims.profile,
                  'every-sign-in',
                  profile
                );

                if (Object.keys(values).length === 0) {
                  return;
                }

                await documentsOf<PluginDocuments>(strapi, PROFILE_UID).update({
                  documentId: profile.documentId,
                  data: values,
                });
              } catch (error) {
                strapi.log.warn(
                  `${PLUGIN_ID}: could not write the provider's claims to the profile of user ${session.userId} ` +
                    `(${(error as Error)?.message ?? String(error)}).`
                );
              }
            },
          },
        },
      },
    },
  }),
});
