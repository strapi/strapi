import { randomBytes } from 'node:crypto';
import type { Core } from '@strapi/types';

import {
  assertConnectCallbacks,
  assertLockedUser,
  assertNoUsersPermissions,
  assertOneWayRelations,
  assertProfileUser,
} from './boot-checks';
import { readCompatConfig } from './compat/config';
import { registerCompatGraphql } from './compat/graphql/compat-schema';
import { applyGraphqlTypeNames } from './compat/graphql/names';
import { PERMISSION_UID, PLUGIN_ID, USER_UID } from './constants';
import { registerGeneratedContentTypes } from './content-types/register-generated';
import { assignDefaultRoleMiddleware } from './document-middlewares/assign-default-role';
import { cascadeUserDeleteMiddleware } from './document-middlewares/cascade-user-delete';
import { createProfileMiddleware } from './document-middlewares/create-profile';
import { normalizeEmailMiddleware } from './document-middlewares/normalize-email';
import { notifyEmailChangeMiddleware } from './document-middlewares/notify-email-change';
import { oneProfilePerUserMiddleware } from './document-middlewares/one-profile-per-user';
import { revokeOnBanMiddleware } from './document-middlewares/revoke-on-ban';
import { syncCredentialsMiddleware } from './document-middlewares/sync-credentials';
import { uniqueUserFieldsMiddleware } from './document-middlewares/unique-user-fields';
import type { AuthEngine } from './engine/types';
import { registerEmailTemplates } from './emails/templates';
import { createExplainMiddleware } from './middlewares/explain';
import { registerConditions } from './services/condition';
import createEndUsersStrategy from './strategies/end-users';
import { engineOwnedUserFieldsValidator } from './utils/engine-owned-user-fields';

/**
 * The user, its roles and its profile are the plugin's GraphQL types. Everything else is the
 * engine's own storage and has no business in a schema: the sessions, the accounts with their
 * password hashes, the verifications, the two-factor secrets, the signing keys of a Better Auth
 * plugin, and the permission rows (the permissions engine's, read through `permissions/me`).
 * Which of them exist depends on the engine's configuration, so they are the names the generator
 * registered, not a fixed list.
 */
const hideEngineTypesFromGraphQL = (strapi: Core.Strapi, registered: string[]) => {
  const graphql = strapi.plugin('graphql');

  // The GraphQL plugin is optional
  if (!graphql) {
    return;
  }

  const { shadowCRUD } = graphql.service('extension');
  const uids = registered
    .map((singularName) => `plugin::${PLUGIN_ID}.${singularName}`)
    .filter((uid) => uid !== USER_UID);

  for (const uid of [...uids, PERMISSION_UID]) {
    shadowCRUD(uid).disable();
  }
};

const SECRET_ENV = 'END_USERS_SECRET';

/**
 * In development, a project that has no secret yet gets one: generated, set for this run, and
 * written to the project's `.env` so the next run reads the same one (as Users & Permissions does
 * for `JWT_SECRET`). It is written once: when the variable is already in the environment nothing is
 * appended. Anywhere else a missing secret is not made up (the validator refuses production).
 * Runs before the engine is built, which reads the secret.
 */
const ensureDevelopmentSecret = (strapi: Core.Strapi) => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  if (strapi.config.get(`plugin::${PLUGIN_ID}.secret`)) {
    return;
  }

  const secret = randomBytes(32).toString('base64');

  strapi.config.set(`plugin::${PLUGIN_ID}.secret`, secret);

  if (!process.env[SECRET_ENV]) {
    const envPath = process.env.ENV_PATH || '.env';

    strapi.fs.appendFile(envPath, `${SECRET_ENV}=${secret}\n`);
    // A development restart that forks again with this process's environment must find it there,
    // or it would append a second one
    process.env[SECRET_ENV] = secret;
    strapi.log.info(
      `${PLUGIN_ID}: no secret was set, so one was generated and stored in ${envPath} under the ` +
        `name ${SECRET_ENV}. Set ${SECRET_ENV} yourself in production.`
    );
  }
};

/**
 * The checks and registrations run at once, so a refused boot throws before anything is built. The
 * Content API conditions come last and are the promise this returns, which Strapi awaits: the
 * built-in ones (`is-self`, `is-owner`), each awaited, then the project's
 * (`src/end-users/conditions`), all before core's condition registry closes when Strapi has loaded.
 */
const register = ({ strapi }: { strapi: Core.Strapi }): Promise<void> => {
  assertLockedUser(strapi);
  assertOneWayRelations(strapi.contentTypes);
  assertProfileUser(strapi.contentTypes);
  assertNoUsersPermissions(strapi);
  ensureDevelopmentSecret(strapi);
  // Before Strapi has loaded: the email plugin refuses a template after that
  registerEmailTemplates(strapi);

  // The tables the engine needs depend on its configuration (the project's Better Auth plugins), so
  // the engine is built now, and its tables become content types before Strapi syncs the database.
  const engine: AuthEngine = strapi.plugin(PLUGIN_ID).service('engine').get();

  const { usersPermissions: compat } = readCompatConfig(strapi);

  hideEngineTypesFromGraphQL(strapi, registerGeneratedContentTypes(strapi, engine));
  // The user and the role are named as Users & Permissions named them while the mode is on, and
  // the mode adds its own operations; both before the GraphQL plugin builds its schema
  applyGraphqlTypeNames(strapi, compat);
  registerCompatGraphql(strapi, compat);

  // In this order: the email is normalised first, so the uniqueness check compares what is stored,
  // and a create that is refused for a taken email never looks up the default role. The rules after
  // them do their work once the user is written (a password, the profile) or around a delete or a
  // ban; the later a rule is registered, the closer it is to the write, so the profile is made
  // after the password is taken out of the data and with the user, and its role, already in the
  // create.
  strapi.documents.use(normalizeEmailMiddleware);
  strapi.documents.use(uniqueUserFieldsMiddleware(strapi));
  strapi.documents.use(assignDefaultRoleMiddleware(strapi));
  strapi.documents.use(syncCredentialsMiddleware(strapi));
  strapi.documents.use(createProfileMiddleware(strapi));
  strapi.documents.use(cascadeUserDeleteMiddleware(strapi));
  strapi.documents.use(revokeOnBanMiddleware(strapi));
  strapi.documents.use(oneProfilePerUserMiddleware(strapi));
  strapi.documents.use(notifyEmailChangeMiddleware(strapi));

  // After core's API-token strategy, which registers first: a token keeps taking precedence, and
  // only a request that is not one reaches this strategy
  strapi.get('auth').register('content-api', createEndUsersStrategy(strapi, compat));

  // Explain mode: what the permission checks did to an end user's Content API request,
  // in a header or the debug log. It wraps every request and only touches those of the strategy
  strapi.server.use(createExplainMiddleware(strapi));

  // `?explain=true` asks for the same in `meta.permissions`. Registered so a route that validates
  // its query accepts it
  strapi.contentAPI.addQueryParams({
    explain: { schema: (z) => z.enum(['true', 'false']).optional() },
  });

  // The fields only Better Auth and the plugin write (`emailVerified`, the two-factor flag, the
  // ban): a Content API write of the user that carries one is a 400. The Content
  // Manager writes through the Document Service, which runs no Content API validator, so
  // administrators keep them
  strapi.validators.add('content-api.input', engineOwnedUserFieldsValidator);

  return assertConnectCallbacks(strapi, engine.isTrustedOrigin).then(() =>
    registerConditions(strapi)
  );
};

export default register;
