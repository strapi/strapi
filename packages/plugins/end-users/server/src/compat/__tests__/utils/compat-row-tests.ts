import type { CompatRow } from '../../rows';

/**
 * The tests that prove each row of the compat checklist, kept apart from the rows themselves so
 * that the runtime holds no test paths. The test next to this one checks every title against its file.
 * Paths are relative to the repository root.
 */

const API = 'tests/api/plugins/end-users/compat';
const MIGRATION = 'tests/api/plugins/end-users/migration';
const PLUGIN = 'packages/plugins/end-users/server/src';

const auth = `${API}/auth.test.api.ts`;
const users = `${API}/users.test.api.ts`;
const sessions = `${API}/sessions.test.api.ts`;
const connect = `${API}/connect.test.api.ts`;
const graphql = `${API}/graphql.test.api.ts`;
const legacy = `${API}/legacy-tokens.test.api.ts`;

/** The cases on a database migrated from Users & Permissions */
const after = `${MIGRATION}/after-migration.test.api.ts`;
const stores = `${MIGRATION}/stores.test.api.ts`;

const compatPlugin = `${PLUGIN}/engine/better-auth/__tests__/strapi-compat.vitest.test.ts`;
const emailPlugin = `${PLUGIN}/engine/better-auth/__tests__/strapi-email.vitest.test.ts`;
const strategy = `${PLUGIN}/strategies/__tests__/end-users.vitest.test.ts`;
const permissions = `${PLUGIN}/controllers/__tests__/permissions.vitest.test.ts`;
const passwords = `${PLUGIN}/compat/__tests__/passwords.vitest.test.ts`;
const shapes = `${PLUGIN}/compat/__tests__/shapes.vitest.test.ts`;
const legacyJwt = `${PLUGIN}/compat/__tests__/legacy-jwt.vitest.test.ts`;
const connectUnit = `${PLUGIN}/compat/__tests__/connect.vitest.test.ts`;
const configMap = `${PLUGIN}/compat/__tests__/config-map.vitest.test.ts`;
const config = `${PLUGIN}/compat/__tests__/config.vitest.test.ts`;
const usersUnit = `${PLUGIN}/compat/__tests__/users-controller.vitest.test.ts`;
const graphqlSchema = `${PLUGIN}/compat/graphql/__tests__/compat-schema.vitest.test.ts`;
const graphqlCall = `${PLUGIN}/compat/graphql/__tests__/call-compat.vitest.test.ts`;

export type CompatRowTest = { file: string; title: string };

export const COMPAT_ROW_TESTS: Record<CompatRow['row'], CompatRowTest[]> = {
  1: [
    {
      file: auth,
      title: 'signs in by email or username and returns { jwt, user } with no role',
    },
    {
      file: auth,
      title: 'returns a jwt that is not a JWT and works as a Bearer token on a Content API route',
    },
    {
      file: auth,
      title: 'answers wrong password, unknown user and a password-less account with the same 400',
    },
    {
      file: compatPlugin,
      title:
        'sends an identifier with @ to the email sign-in and anything else to the username sign-in, lower-cased',
    },
    {
      file: compatPlugin,
      title: 'answers a two-factor user with 403 TWO_FACTOR_REQUIRED and no token',
    },
    {
      file: after,
      title: 'signs a migrated user in by email and by username with the old password',
    },
  ],
  2: [
    {
      file: auth,
      title:
        'registers and returns { jwt, user } with the default role, one profile and a Registration field stored on it',
    },
    {
      file: auth,
      title: 'answers the same 400 for a taken email and a taken username',
    },
    {
      file: auth,
      title: 'returns { user } and sends the confirmation email when verification is on',
    },
    { file: auth, title: 'refuses deviceId' },
    {
      file: compatPlugin,
      title: 'refuses unlisted keys with the users-permissions text, deviceId included',
    },
    {
      file: after,
      title: 'registers a new user next to the migrated ones, with the migrated default role',
    },
  ],
  3: [
    {
      file: auth,
      title: 'returns a jwt that is not a JWT and works as a Bearer token on a Content API route',
    },
    {
      file: auth,
      title: 'lets a role holding an api:: permission row govern a Content API route',
    },
    {
      file: after,
      title: 'accepts the jwt of a migrated user as a Bearer token on a Content API route',
    },
  ],
  4: [
    { file: legacy, title: 'accepts a legacy { id } token issued before the cut-off' },
    {
      file: legacy,
      title: 'answers 401 when no completed migration is recorded',
    },
    { file: legacy, title: 'answers 401 for a token issued after the cutover' },
    {
      file: sessions,
      title: 'an old refresh token from before the cutover exchanges for a session',
    },
    { file: sessions, title: 'an old access token works as a Bearer token' },
    {
      file: after,
      title: 'answers 401 for a bad token and accepts a legacy token issued before the cutover',
    },
  ],
  5: [
    { file: auth, title: 'signs in with a migrated bcrypt hash' },
    {
      file: after,
      title: 'keeps the stored hash: the old password signs in and a wrong one does not',
    },
  ],
  6: [
    {
      file: auth,
      title: 'is named users-permissions and exposes one role of type authenticated',
    },
    {
      file: permissions,
      title: 'answers the strategy under its users-permissions name only with compat on',
    },
    {
      file: after,
      title: 'names the strategy users-permissions and gives a migrated user their migrated role',
    },
  ],
  7: [
    { file: users, title: 'a relation from an app type to the user resolves' },
    {
      file: after,
      title: 'resolves an app relation that pointed at a user before the migration',
    },
  ],
  8: [
    {
      file: users,
      title: 'derives confirmed, blocked and provider from the stored fields',
    },
    { file: users, title: 'resolves a numeric id and a documentId to the same user' },
    {
      file: legacyJwt,
      title: 'verifies a legacy { id } token and resolves the numeric id to a documentId',
    },
    {
      file: after,
      title:
        'keeps numeric ids and documentIds, and derives confirmed, blocked and provider from the migrated data',
    },
  ],
  9: [
    {
      file: users,
      title: 'merges profile fields into the user and writes them to the profile',
    },
    {
      file: shapes,
      title:
        'merges the profile and the provider, and never lets a profile field replace a user field',
    },
    {
      file: after,
      title: 'merges the migrated custom fields into the user and writes them to the profile',
    },
  ],
  10: [
    {
      file: auth,
      title:
        'registers and returns { jwt, user } with the default role, one profile and a Registration field stored on it',
    },
    {
      file: users,
      title: 'shows role only with populate=role on /users/me, as { id, name, description, type }',
    },
    {
      file: shapes,
      title: 'takes the first role and returns null for none',
    },
    { file: after, title: 'shows the migrated role with its old id on /users/me?populate=role' },
  ],
  11: [
    {
      file: auth,
      title: 'lets a role holding an api:: permission row govern a Content API route',
    },
    {
      file: after,
      title: 'lets a migrated api:: permission govern a route and refuses one that was not granted',
    },
  ],
  12: [
    { file: legacy, title: 'answers 401 for a token signed with another secret' },
    { file: legacy, title: 'answers 401 for an expired token' },
    {
      file: strategy,
      title: 'answers 401 for a bad token and never falls back to Public',
    },
    {
      file: after,
      title: 'answers 401 for a bad token and accepts a legacy token issued before the cutover',
    },
  ],
  13: [
    {
      file: auth,
      title: 'gives unconfirmed and blocked users the users-permissions 400 messages',
    },
    {
      file: legacy,
      title: 'refuses a banned user holding a valid token with 403 USER_BANNED',
    },
    {
      file: strategy,
      title: 'is refused with 403 and the code EMAIL_NOT_VERIFIED, as a PolicyError',
    },
    {
      file: after,
      title:
        'refuses the migrated blocked and unconfirmed users with the users-permissions messages',
    },
  ],
  14: [
    {
      file: auth,
      title: 'answers Register action is currently disabled when sign-up is off',
    },
    { file: auth, title: 'answers the same 400 for a taken email and a taken username' },
    {
      file: auth,
      title:
        'confirms by the ?confirmation= link, redirects to the configured URL, and answers 400 Invalid token for a bad one',
    },
    { file: auth, title: 'answers This provider is disabled when the email method is off' },
    { file: after, title: 'keeps the migrated sign-up and redirect settings' },
  ],
  15: [
    {
      file: auth,
      title: 'answers { ok: true } for a known and an unknown email and emails a ?code= link',
    },
    {
      file: auth,
      title:
        'resets with code, password and passwordConfirmation, returns { jwt, user }, and the old password stops working',
    },
    {
      file: auth,
      title:
        'ends the sessions that existed before the reset: the old token answers 401, the new jwt 200',
    },
    {
      file: passwords,
      title: 'refuse a forgot-password request while email and password sign-in is off',
    },
    {
      file: after,
      title: 'sends a reset link to the migrated reset URL and resets the password',
    },
  ],
  16: [
    {
      file: auth,
      title:
        'confirms by the ?confirmation= link, redirects to the configured URL, and answers 400 Invalid token for a bad one',
    },
    {
      file: auth,
      title: 'send-email-confirmation answers { email, sent: true } for an unknown address too',
    },
    { file: auth, title: 'a verification email carries a ?confirmation= link' },
    {
      file: auth,
      title:
        'confirms an old ?confirmation= link once and redirects, and answers 400 the second time',
    },
    { file: after, title: 'confirms a confirmation link sent before the migration, once' },
  ],
  17: [
    {
      file: emailPlugin,
      title: 'builds ?code= and ?confirmation= links only with compat on',
    },
  ],
  18: [
    {
      file: auth,
      title: 'changes the password, returns a new jwt and the old session token stops working',
    },
    { file: after, title: "changes a migrated user's password and keeps the old column in step" },
  ],
  19: [
    {
      file: connect,
      title: 'starts the flow at /connect/:provider and sends the browser to the provider',
    },
    {
      file: connect,
      title:
        'the provider returns to /connect/:provider/callback and the browser lands on the front-end URL with no token in it',
    },
    { file: connect, title: 'answers 404 for /api/connect with compat off' },
    {
      file: after,
      title: 'starts the GitHub flow with the migrated client id and the old callback address',
    },
  ],
  20: [
    {
      file: connect,
      title:
        'GET /auth/:provider/callback with that session returns { jwt, user }, and a session-less call is refused',
    },
    { file: connect, title: 'refuses the exchange a second time for the same session' },
    { file: connect, title: 'ignores ?access_token=' },
    {
      file: after,
      title:
        'links a provider user from before the migration on their first sign-in and exchanges the session once',
    },
  ],
  21: [
    {
      file: connectUnit,
      title: 'sets redirectURI to the connect callback only with compat on',
    },
    { file: connect, title: 'the admin shows /api/connect/<id>/callback as the redirect URI' },
    {
      file: stores,
      title: 'stores github with its secret encrypted and shows the connect callback',
    },
    {
      file: stores,
      title: 'stores auth0 with tenant.auth0.com and twitter disabled, and lists instagram',
    },
  ],
  22: [{ file: connect, title: 'links a second sign-in to the same user by verified email' }],
  23: [],
  24: [
    {
      file: sessions,
      title:
        'returns { jwt, refreshToken, user } and sets the cookie only with httpOnly or the header',
    },
    { file: sessions, title: 'refresh rotates and a replay is 401' },
    { file: sessions, title: 'refresh works from the cookie' },
    { file: sessions, title: 'logout with scope all signs every session out' },
    { file: sessions, title: 'a device logout leaves other devices' },
    {
      file: sessions,
      title: 'answers 404 on refresh, logout and sessions with refresh off',
    },
    {
      file: after,
      title: 'exchanges a refresh token issued before the migration and rotates it',
    },
  ],
  25: [
    {
      file: configMap,
      title:
        'has an entry for exactly the Users & Permissions config keys, and a null target says why',
    },
    {
      file: config,
      title:
        'fills every default, including the cookie name and a secure flag that follows NODE_ENV',
    },
  ],
  26: [
    {
      file: auth,
      title: 'locks the account after five wrong passwords through /local',
    },
    { file: auth, title: 'answers the sixth attempt with 429' },
    {
      file: compatPlugin,
      title: 'declares a rate-limit rule for each compat path and none for the native ones',
    },
    { file: graphql, title: 'limits the sixth login attempt like REST' },
    { file: after, title: 'locks a migrated account after five wrong passwords' },
  ],
  27: [
    {
      file: users,
      title: 'lists users as a bare array with numeric id and documentId and strips private fields',
    },
    { file: auth, title: 'keeps private fields out of the user' },
    {
      file: shapes,
      title:
        'gives numeric id and documentId, confirmed and blocked from the stored fields, and no private field',
    },
    { file: after, title: 'never shows the carried users-permissions columns in a user payload' },
  ],
  28: [
    {
      file: graphql,
      title: 'login returns { jwt, user } with the profile fields and the same errors as /local',
    },
    {
      file: graphql,
      title: 'register, forgotPassword, resetPassword, changePassword and emailConfirmation work',
    },
    { file: graphql, title: 'me returns the user with its role, and errors without a caller' },
    { file: graphql, title: 'a typed fragment on UsersPermissionsUser still validates' },
    {
      file: graphqlSchema,
      title: 'registers the types, me and the mutations with compat on',
    },
    {
      file: graphqlCall,
      title:
        'refuses an endpoint of a sign-in method that is turned off, as the REST route does, without calling the engine',
    },
    { file: after, title: 'signs a migrated user in through the GraphQL login' },
  ],
  29: [
    {
      file: graphql,
      title:
        'creates, updates and deletes a user under the UsersPermissions names with the end-users scopes',
    },
    { file: graphql, title: 'has no role mutations, and no permission type' },
  ],
  30: [
    {
      file: users,
      title: 'lists users as a bare array with numeric id and documentId and strips private fields',
    },
    { file: users, title: 'answers a bare number on /users/count' },
    { file: users, title: 'resolves a numeric id and a documentId to the same user' },
    {
      file: users,
      title:
        'filters and populates by role on /users when the role is granted Find on the role type',
    },
    {
      file: users,
      title: 'refuses filtering by role on /users without the role grant',
    },
    {
      file: usersUnit,
      title:
        'turns the core { data, meta } list into a bare array and the count into a bare number',
    },
  ],
  31: [
    {
      file: users,
      title: 'answers 404 on /api/users-permissions/roles and /permissions',
    },
  ],
  32: [],
  33: [],
  34: [
    { file: users, title: 'shows the compat summary to an admin, without a secret' },
    { file: users, title: 'still answers the roles routes of the admin side' },
    { file: stores, title: 'lets the Editor admin role keep its end-user permissions' },
  ],
  35: [{ file: auth, title: 'fires entry.create for the new user' }],
  36: [
    { file: users, title: 'answers 404 for a missing user' },
    { file: auth, title: 'refuses deviceId' },
  ],
};
