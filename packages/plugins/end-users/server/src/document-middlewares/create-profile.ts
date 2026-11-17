import type { Core, Modules } from '@strapi/types';

import { PLUGIN_ID, PROFILE_UID, USER_UID } from '../constants';
import { takePendingProfile } from '../utils/pending-profile';
import { readProviderClaims } from '../utils/provider-claims';
import { asProfileLifecycle } from '../utils/profile-lifecycle';
import type providerService from '../services/provider';
import { documentsOf, type PluginDocuments } from '../utils/typed-strapi';

type Plain = Record<string, unknown>;

/**
 * `create-profile`: every user create makes the user's profile, whatever the source: Better Auth's
 * sign-up, an OAuth callback, the Content Manager, a script, a migration. A user and its profile
 * come and go together; `one-profile-per-user` refuses a profile made any other way.
 *
 * The profile is made in the same database transaction as the user, once the user exists (the
 * default role is in the user's own create, see `assign-default-role`), so there is never a user
 * without the profile it was promised, nor a profile without a user. A profile that cannot be made
 * (a field the project made required and gave no default) fails the create of the user with it.
 *
 * A sign-up that carried profile fields (`strapi-profile` checked them against the registration
 * fields) has them written here, with the profile, in that one create.
 *
 * A user made by a provider sign-in has the provider's claims the sign-up mappings name written the
 * same way (`service('provider').profileValues`, checked against the profile's own validation, a
 * refused value skipped and logged). They go under the sign-up's own fields, which a provider sign-in
 * never has.
 *
 * The profile create is marked as the plugin's own (`asProfileLifecycle`), which is the only way a
 * profile create passes `one-profile-per-user`.
 */
export const createProfileMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (ctx, next) => {
    if (ctx.uid !== USER_UID || ctx.action !== 'create') {
      return next();
    }

    const pending = takePendingProfile(strapi);
    const claims = readProviderClaims(strapi);
    let mapped: Plain = {};

    if (claims) {
      // The mapping is information, not a gate: a failure here never fails the sign-up
      try {
        mapped = await (
          strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<typeof providerService>
        ).profileValues(claims.providerId, claims.profile, 'sign-up');
      } catch (error) {
        strapi.log.warn(
          `${PLUGIN_ID}: the provider's claims could not be mapped onto the new profile, which is made without them (${(error as Error)?.message ?? String(error)}).`
        );
      }
    }

    const fields: Plain = { ...mapped, ...pending?.fields };
    return strapi.db.transaction(async () => {
      const user = await next();
      const documentId = (user as { documentId?: string } | null | undefined)?.documentId;

      if (documentId) {
        // `user` last: nothing a sign-up sent can name another owner
        await asProfileLifecycle(() =>
          documentsOf<PluginDocuments>(strapi, PROFILE_UID).create({
            data: { ...fields, user: { connect: [documentId] } },
          })
        );
      }

      return user;
    });
  };
