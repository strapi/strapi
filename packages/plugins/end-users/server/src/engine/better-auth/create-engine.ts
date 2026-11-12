/**
 * The Better Auth implementation of `AuthEngine`.
 *
 * `buildAuthOptions` assembles the options: the plugin's own base, the project's `auth`
 * (`defineAuth`) merged over it, and the plugins in a fixed order. `createEngine` builds one
 * Better Auth instance from them and puts the `AuthEngine` methods on top of it.
 *
 * This folder is the only place that imports `better-auth`.
 */
import bcrypt from 'bcryptjs';
import { betterAuth } from 'better-auth/minimal';
import type { Auth, BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { verifyPassword as scryptVerify } from 'better-auth/crypto';
import { getAuthTables } from 'better-auth/db';
import {
  admin,
  bearer,
  genericOAuth as genericOAuthPlugin,
  twoFactor,
  username,
} from 'better-auth/plugins';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PLUGIN_ID } from '../../constants';
import { readCompatConfig } from '../../compat/config';
import { revokeLegacySessions } from '../../compat/legacy-sessions';
import { compatRateLimitResponse } from '../../compat/rate-limit';
import { parseDuration } from '../../config/duration';
import { banState } from '../../utils/ban';
import { setProviderClaims } from '../../utils/provider-claims';
import type settingsService from '../../services/settings';
import type {
  AuthEngine,
  CredentialSource,
  EngineAccount,
  EngineSession,
  ID,
  InstalledMethod,
  NativeEndpoint,
  NativeResult,
  RequestMeta,
  SessionLookup,
} from '../types';
import { passwordProblem } from '../password-policy';
import { DISCOVERY_TIMEOUT_MS } from '../../providers/discovery';
import { emptyStartupInputs } from '../startup-inputs';
import type { StartupInputs } from '../startup-inputs';
import { strapiAdapter } from './adapter/adapter';
import { resolveBasePath } from './base-path';
import { isDefineAuthResult } from './define-auth';
import type { DefineAuthResult } from './define-auth';
import { strapiNormalize } from './plugins/strapi-normalize';
import { lastSignIn } from './plugins/last-sign-in';
import { emailSenders, strapiEmail, twoFactorOptions } from './plugins/strapi-email';
import { keyOfAccount, lockout } from './plugins/lockout';
import { clearAttempts } from './lockout-counter';
import { passwordPolicy } from './plugins/password-policy';
import { backgroundTaskHandler } from './background-tasks';
import { strapiCompat } from './plugins/strapi-compat';
import { bannedReset, withoutBannedRecipients } from './plugins/banned-reset';
import { totpReplay } from './plugins/totp-replay';
import { secondFactor } from './plugins/second-factor';
import { revokeOnPasswordChange } from './plugins/revoke-on-password-change';
import { legacyRevoke } from './plugins/legacy-revoke';
import { resolvePreset } from './presets';
import { pendingLink } from './plugins/pending-link';
import { providerProfile } from './plugins/provider-profile';
import { strapiProfile } from './plugins/strapi-profile';
import { fromAuthTables } from './schema/from-auth-tables';
import { resolveServerOrigin } from './server-origin';
import { isPlainObject } from '../../utils/is-plain';

const CONFIG = `plugin::${PLUGIN_ID}`;

/** What the two-factor plugin starts the verification identifier of a trusted device with. */
const TRUST_DEVICE_PREFIX = 'trust-device-';

/**
 * How verification identifiers are stored. A password-reset row's identifier is the emailed token
 * itself (`reset-password:<token>`), so it is stored hashed: a database read must not hand out
 * tokens that reset passwords. Better Auth hashes on every lookup with the same rule. The rest stay
 * plain: a two-factor reset finds a user's trusted devices by the `trust-device-` identifier.
 */
const STORE_IDENTIFIER = {
  default: 'plain',
  overrides: { 'reset-password:': 'hashed' },
} as const;

/** How long a session stays open to the one exchange that follows its provider sign-in. */
const PROVIDER_SESSION_MARK_MS = 5 * 60 * 1000;

const providerSessionMark = (provider: string, sessionId: string) =>
  `provider-session-${encodeURIComponent(provider)}-${sessionId}`;

/**
 * Better Auth plugins installed for every project, in this order.
 *
 * `twoFactor` comes before `bearer`: both have an after-hook on sign-in, and they run in plugin
 * order. `twoFactor` deletes the session it just created when the user still has to give a second
 * factor; `bearer` copies the session cookie into a `set-auth-token` header. With `bearer` first, a
 * two-factor user's password sign-in is answered with a token for a session that no longer exists.
 *
 * The `admin` plugin is here for its schema (ban fields, `user.role`, `session.impersonatedBy`)
 * and its hooks (the ban check when a session is created); its own endpoints are blocked by the
 * endpoint allow-list.
 */
const betterAuthPlugins = (strapi: Core.Strapi): BetterAuthPlugin[] => [
  username(),
  twoFactor(twoFactorOptions(strapi)),
  bearer(),
  admin(),
];

/**
 * The plugin's own Better Auth plugins, in order, installed after the ones above and before the
 * project's. It lists them in this order:
 *
 *   1. `strapi-normalize` (trims and lowercases the email of every request), installed
 *   2. `strapi-roles`     (not needed: a user is given its default role by the `assign-default-role`
 *                         Document Service middleware, in the same create, whoever creates it)
 *   3. `strapi-profile`   (sign-up fields go to the profile), installed
 *   4. `strapi-email`     (redirects from the settings, the welcome at sign-up), installed
 *   5. `lockout`          (failed password sign-ins lock the account), installed, then
 *      `banned-reset`     (a banned user gets no reset link and can't redeem one), and
 *      `totp-replay`      (an authenticator code is taken once)
 *   6. `password-policy`  (the admin's password rules on every way a password is set), installed
 *      `revoke-on-password-change` (a password change signs the other sessions out), and
 *      `legacy-revoke`    (those revokes end the old Users & Permissions tokens too, with the
 *                         compatibility mode on or off)
 *   7. `last-sign-in`, `provider-profile` (the email guard, the every-sign-in profile mappings)
 *      `second-factor` (a session records whether a second factor made it); after `twoFactor`,
 *      whose after-hook it reads the result of
 *   8. `legacy-jwt`, when it exists
 *
 * `strapi-compat` (the Users & Permissions routes) is installed before all of these when the
 * compatibility mode is on, so a hook of its own runs ahead of theirs.
 */
const strapiPlugins = (strapi: Core.Strapi): BetterAuthPlugin[] => [
  strapiNormalize(),
  strapiProfile(strapi),
  strapiEmail(strapi),
  lockout(strapi),
  bannedReset(),
  totpReplay(strapi),
  passwordPolicy(strapi),
  revokeOnPasswordChange(),
  legacyRevoke(strapi),
  lastSignIn(strapi),
  providerProfile(strapi),
  secondFactor(),
];

/* ---------------------------------------------------------------------------------------------
 * Passwords
 * ------------------------------------------------------------------------------------------- */

const BCRYPT_HASH = /^\$2[abxy]\$\d{2}\$.{53}$/;

/**
 * Better Auth's own scrypt verification, plus bcrypt hashes: migrated users come with the hash
 * Users & Permissions stored. A hash that cannot be read is a password that does not match, not a
 * server error.
 */
const verifyPasswordHash = async ({ hash, password }: { hash: string; password: string }) => {
  if (typeof hash !== 'string' || hash.length === 0) {
    return false;
  }

  try {
    if (BCRYPT_HASH.test(hash)) {
      return await bcrypt.compare(password, hash);
    }

    return await scryptVerify({ hash, password });
  } catch {
    return false;
  }
};

/** U&P's cost factor, so a hash written here is one U&P reads when a project rolls back. */
const BCRYPT_ROUNDS = 10;

/**
 * What `emailAndPassword.password` is. With the compatibility mode on, passwords are hashed with
 * bcrypt, as Users & Permissions did, so the hash mirrored into the user row still signs the
 * user in after a rollback. Off, hashing stays Better Auth's own and only `verify` is widened.
 */
const passwordHashing = (usersPermissions: boolean) =>
  usersPermissions
    ? {
        hash: (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS),
        verify: verifyPasswordHash,
      }
    : { verify: verifyPasswordHash };

/* ---------------------------------------------------------------------------------------------
 * Options
 * ------------------------------------------------------------------------------------------- */

type Plain = Record<string, unknown>;

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Project values win; groups of options are merged, anything else is replaced. */
const mergeOptions = (base: Plain, override: Plain): Plain => {
  const merged: Plain = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined || UNSAFE_KEYS.has(key)) {
      continue;
    }

    const current = merged[key];

    merged[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeOptions(current, value) : value;
  }

  return merged;
};

/**
 * What the plugin owns and a project cannot change. `defineAuth` refuses these with a message; this
 * is the second line, for a result that was not made by `defineAuth`.
 */
const withoutProtectedOptions = (options: Plain): Plain => {
  const {
    database: _database,
    secret: _secret,
    secrets: _secrets,
    baseURL: _baseURL,
    basePath: _basePath,
    telemetry: _telemetry,
    plugins: _plugins,
    // The plugin configuration's alone, where it is validated
    trustedOrigins: _trustedOrigins,
    ...rest
  } = options;
  const result: Plain = { ...rest };

  if (isPlainObject(result.user)) {
    const { additionalFields: _additionalFields, ...user } = result.user;
    result.user = user;
  }

  // `fields` and `modelName` rename attributes and tables
  for (const group of ['user', 'session', 'account', 'verification']) {
    const groupOptions = result[group];

    if (isPlainObject(groupOptions)) {
      const { fields: _fields, modelName: _modelName, ...kept } = groupOptions;
      result[group] = kept;
    }
  }

  // A hashed identifier hides the trusted-device rows from the two-factor reset; the rate limit
  // table is locked like the others
  if (isPlainObject(result.verification)) {
    const { storeIdentifier: _storeIdentifier, ...verification } = result.verification;
    result.verification = verification;
  }

  if (isPlainObject(result.rateLimit)) {
    const { fields: _fields, modelName: _modelName, ...rateLimit } = result.rateLimit;
    result.rateLimit = rateLimit;
  }

  // Secondary storage keeps sessions and verification values out of the tables that revoking, a ban
  // and the two-factor reset delete from, so it is never passed on
  delete result.secondaryStorage;

  if (isPlainObject(result.rateLimit) && result.rateLimit.storage === 'secondary-storage') {
    // The plugin's own choice (memory or database) stays
    const { storage: _storage, ...rateLimit } = result.rateLimit;
    result.rateLimit = rateLimit;
  }

  // The origin and CSRF checks stay on: the base sets both, and nothing the project passes turns
  // them off
  if (isPlainObject(result.advanced)) {
    const {
      database: _advancedDatabase,
      disableOriginCheck: _disableOriginCheck,
      disableCSRFCheck: _disableCSRFCheck,
      ...advanced
    } = result.advanced;
    result.advanced = advanced;
  }

  return result;
};

/** Where the rate limit counters live: the configured storage, else the database in production */
export const rateLimitStorage = (strapi: Core.Strapi) => {
  const configured = strapi.config.get<string | undefined>(`${CONFIG}.rateLimit.storage`);
  const storage = configured ?? (process.env.NODE_ENV === 'production' ? 'database' : 'memory');

  if (storage !== 'database' && storage !== 'memory') {
    throw new Error(
      `Invalid ${PLUGIN_ID} configuration: rateLimit.storage must be "database" or "memory", ` +
        `got ${JSON.stringify(storage)}.`
    );
  }

  return storage;
};

/**
 * Better Auth reports its configuration when `BETTER_AUTH_TELEMETRY` is on in the environment *or*
 * `telemetry.enabled` is set, so turning the option off is not enough: the variable has to be off
 * too. It belongs to the Better Auth inside this plugin (a project never has a second one), so it
 * is switched off here, with a warning when someone had switched it on.
 */
const turnTelemetryOff = (strapi: Core.Strapi) => {
  const value = process.env.BETTER_AUTH_TELEMETRY;

  // Better Auth's own reading of it: anything but empty, "0" and "false" is on
  if (value && value !== '0' && value.toLowerCase() !== 'false') {
    process.env.BETTER_AUTH_TELEMETRY = 'false';

    strapi.log.warn(
      `${PLUGIN_ID}: BETTER_AUTH_TELEMETRY is ignored. Telemetry is always off for end-user ` +
        'authentication.'
    );
  }
};

const configured = <T>(strapi: Core.Strapi, key: string) =>
  strapi.config.get<T | undefined>(`${CONFIG}.${key}`);

/** `session` options from the plugin config. Only what is configured is set. */
const sessionOptions = (strapi: Core.Strapi) => {
  const session: Plain = {};

  const expiresIn = parseDuration(configured(strapi, 'session.expiresIn'));
  const updateAge = parseDuration(configured(strapi, 'session.updateAge'));
  const cookieCache = configured<string | number | false>(strapi, 'session.cookieCache');

  if (expiresIn !== undefined) session.expiresIn = expiresIn;
  if (updateAge !== undefined) session.updateAge = updateAge;

  if (cookieCache === false) {
    session.cookieCache = { enabled: false };
  } else if (cookieCache !== undefined && parseDuration(cookieCache) !== undefined) {
    session.cookieCache = { enabled: true, maxAge: parseDuration(cookieCache) };
  }

  return session;
};

/** `advanced` options from the plugin config: how the cookies are set. */
const cookieOptions = (strapi: Core.Strapi) => {
  const advanced: Plain = {};
  const domain = configured<string>(strapi, 'cookies.domain');

  // A front end on another site gets no cookie from `SameSite=Lax`, the default
  if (configured<boolean>(strapi, 'cookies.crossSite') === true) {
    advanced.defaultCookieAttributes = { sameSite: 'none', secure: true };
  }

  if (typeof domain === 'string' && domain !== '') {
    advanced.crossSubDomainCookies = { enabled: true, domain };
  }

  return advanced;
};

/**
 * The rate limit: on in every environment unless the project turns it off (Better Auth alone
 * limits in production only). `window`, `max` and `customRules` are passed only when configured, so
 * Better Auth's own defaults apply to what is left out.
 */
const rateLimitOptions = (strapi: Core.Strapi): Plain => {
  const window = configured<number>(strapi, 'rateLimit.window');
  const max = configured<number>(strapi, 'rateLimit.max');
  const customRules = configured<Plain>(strapi, 'rateLimit.customRules');

  return {
    enabled: configured<boolean>(strapi, 'rateLimit.enabled') ?? true,
    storage: rateLimitStorage(strapi),
    ...(window === undefined || window === null ? {} : { window }),
    ...(max === undefined || max === null ? {} : { max }),
    ...(customRules === undefined || customRules === null ? {} : { customRules }),
  };
};

/**
 * A provider's config with `mapProfileToUser` wrapped: Better Auth calls it with the provider's raw
 * profile while it reads the user, which is when the claims are left for the request (`create-profile`
 * writes the sign-up mappings with the user, `provider-profile` the every-sign-in ones). What the
 * definition's own `mapProfileToUser` returns is kept.
 */
const withClaims = (strapi: Core.Strapi, providerId: string, config: unknown): Plain => {
  const own = (config as Plain).mapProfileToUser as ((profile: unknown) => unknown) | undefined;

  return {
    ...(config as Plain),
    async mapProfileToUser(profile: unknown) {
      setProviderClaims(strapi, { providerId, profile });

      return own ? own(profile) : {};
    },
  };
};

/**
 * The Better Auth options: the plugin's base, the project's `auth` merged over it, and the
 * plugins in order (the plugin's own, then the project's). `inputs` are the admin settings Better
 * Auth reads only when it is built.
 */
export const buildAuthOptions = (
  strapi: Core.Strapi,
  project?: DefineAuthResult,
  inputs: StartupInputs = emptyStartupInputs()
): BetterAuthOptions => {
  const { providers } = inputs;
  const socialProviders = Object.fromEntries(
    Object.entries(providers.socialProviders).map(([id, config]) => [
      id,
      withClaims(strapi, id, config),
    ])
  );
  const genericOAuth = providers.genericOAuth.map((config) =>
    withClaims(strapi, (config as { providerId: string }).providerId, resolvePreset(config))
  );
  const compat = readCompatConfig(strapi);
  const projectPlugins =
    (isPlainObject(project?.options) ? project?.options.plugins : undefined) ?? [];
  const senders = emailSenders(strapi);

  const base: Plain = {
    database: strapiAdapter(),
    secret: configured<string>(strapi, 'secret'),
    // Always set, and always Strapi's own: left out, Better Auth takes the origin (the Host header)
    // of each request, and a forged one would decide where the links in its emails point.
    baseURL: resolveServerOrigin(strapi.config),
    basePath: resolveBasePath(strapi.config),
    session: sessionOptions(strapi),
    advanced: {
      ...cookieOptions(strapi),
      cookiePrefix: 'strapi',
      // Better Auth's origin and CSRF checks (against `trustedOrigins`) are off by default when
      // NODE_ENV is "test" (`skipOriginCheck` in `better-auth/dist/context/create-context.mjs`).
      // Set explicitly, `false` keeps them on in every environment, so a test run behaves like
      // production and can show that `trustedOrigins` is what decides.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      // Strapi's Document Service makes the id (a documentId). The adapter does not ask for one
      // either (`disableIdGeneration`); this keeps Better Auth's own id helper in step with it.
      database: { generateId: false },
      // The emails and the timing work Better Auth can leave until after the response run detached,
      // so a known address does not answer more slowly than an unknown one
      backgroundTasks: { handler: backgroundTaskHandler(strapi) },
    },
    rateLimit: rateLimitOptions(strapi),
    verification: { storeIdentifier: STORE_IDENTIFIER },
    // There is no hosted service to report to. (See `turnTelemetryOff` for the environment.)
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: inputs.requireEmailVerification,
      password: passwordHashing(compat.usersPermissions),
      // The widest range the settings allow: the admin's `minLength` and `maxLength` are checked per
      // request by `password-policy`, so a change needs no rebuild. Never read the admin's values here.
      minPasswordLength: 8,
      maxPasswordLength: 256,
      // A reset signs the user out everywhere: whoever held a session keeps it no longer
      revokeSessionsOnPasswordReset: true,
      // ...and out of the sessions Users & Permissions issued, which that setting does not reach
      onPasswordReset: async ({ user }: { user: { id: string } }) =>
        revokeLegacySessions(strapi, user.id),
      ...senders.emailAndPassword,
    },
    // Every email goes through the email plugin's templates; a sender the project sets wins
    emailVerification: senders.emailVerification,
    // The confirmation goes to the new address, through `emailVerification.sendVerificationEmail`
    user: {
      changeEmail: { enabled: true },
      // Strapi's default user fields. Only the plugin sets `additionalFields`: a
      // project's are refused by `defineAuth` and dropped by `withoutProtectedOptions`.
      additionalFields: {
        // Chosen by the end user, used to pick the language of the emails. Not `locale`: that is
        // the Document Service's, which i18n adds to the user type as before.
        preferredLocale: { type: 'string', required: false, input: true },
        // Set when a session is created (`last-sign-in`); no request carries it
        lastSignInAt: { type: 'date', required: false, input: false },
        // Set when the user's sessions are all revoked (`revokeLegacySessions`): an old Users &
        // Permissions token issued at or before it is refused. Never returned, never written by a
        // request.
        legacyTokensRevokedAt: { type: 'date', required: false, input: false, returned: false },
      },
    },
    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),
    ...(providers.trustedProviders.length > 0
      ? { account: { accountLinking: { trustedProviders: providers.trustedProviders } } }
      : {}),
  };

  const projectOptions = withoutProtectedOptions((project?.options ?? {}) as Plain);
  const merged = mergeOptions(base, projectOptions);
  const emailAndPassword = merged.emailAndPassword as Plain | undefined;

  // The sender in use, the plugin's or the project's, mails nothing to a banned user
  if (typeof emailAndPassword?.sendResetPassword === 'function') {
    merged.emailAndPassword = {
      ...emailAndPassword,
      sendResetPassword: withoutBannedRecipients(
        emailAndPassword.sendResetPassword as Parameters<typeof withoutBannedRecipients>[0]
      ),
    };
  }

  // The plugin configuration's list, validated at boot, is the only one: the project has none
  const trustedOrigins = configured<string[]>(strapi, 'trustedOrigins') ?? [];

  return {
    ...merged,
    ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
    plugins: [
      ...(compat.usersPermissions ? [strapiCompat(strapi, compat)] : []),
      ...betterAuthPlugins(strapi),
      ...strapiPlugins(strapi),
      ...(genericOAuth.length > 0 ? [genericOAuthPlugin({ config: genericOAuth as never })] : []),
      // The links exist only while compat is on. A social provider that a generic one of the same
      // id shadows is not one it may wrap
      ...(compat.usersPermissions
        ? [
            pendingLink(
              strapi,
              Object.keys(socialProviders).filter(
                (id) =>
                  !genericOAuth.some(
                    (config) => (config as { providerId?: unknown }).providerId === id
                  )
              )
            ),
          ]
        : []),
      ...(projectPlugins as BetterAuthPlugin[]),
    ],
  } as BetterAuthOptions;
};

/**
 * The project's auth options: `auth` in the plugin configuration (`config/plugins.ts`,
 * `'end-users'.config.auth`, written with `defineAuth()`), or `undefined` when it has none.
 */
export const loadProjectAuth = (strapi: Core.Strapi): DefineAuthResult | undefined => {
  const auth = configured<unknown>(strapi, 'auth');

  if (auth === undefined || auth === null) {
    return undefined;
  }

  if (!isDefineAuthResult(auth)) {
    throw new Error(
      `Invalid ${PLUGIN_ID} configuration: \`auth\` in config/plugins.ts must be the result of ` +
        "defineAuth(), imported from '@strapi/plugin-end-users/auth'."
    );
  }

  return auth;
};

/**
 * The email senders the plugin supports in `auth`, by their path in the options and the template
 * each one sends. The one list behind both the experimental-options warning and the sender
 * summary of the admin (`configSummary`). The senders inside the plugins it re-exports (magic
 * link, email OTP, two-factor) are supported through `plugins`, not listed here.
 */
export const SUPPORTED_SENDERS: ReadonlyArray<{ path: readonly string[]; template: string }> = [
  { path: ['emailVerification', 'sendVerificationEmail'], template: 'verify-email' },
  { path: ['emailAndPassword', 'sendResetPassword'], template: 'reset-password' },
  { path: ['user', 'changeEmail', 'sendChangeEmailConfirmation'], template: 'change-email' },
];

const isSupportedPath = (path: string[]) =>
  SUPPORTED_SENDERS.some(
    (sender) =>
      sender.path.length === path.length && sender.path.every((part, i) => part === path[i])
  );

const isPrefixOfSupportedPath = (path: string[]) =>
  SUPPORTED_SENDERS.some(
    (sender) => sender.path.length > path.length && path.every((part, i) => part === sender.path[i])
  );

/**
 * The options in `auth` that are passed to Better Auth as they are but are not modeled by the
 * plugin: `plugins` and the email senders (`SUPPORTED_SENDERS`) are supported, everything else is
 * experimental.
 */
export const experimentalAuthOptions = (project?: DefineAuthResult): string[] => {
  const options = isPlainObject(project?.options) ? (project?.options as Plain) : {};

  const walk = (value: Plain, path: string[]): string[] =>
    Object.keys(value).flatMap((key) => {
      const here = [...path, key];

      // `plugins` is supported as a whole
      if (value[key] === undefined || isSupportedPath(here) || here[0] === 'plugins') {
        return [];
      }

      if (isPrefixOfSupportedPath(here) && isPlainObject(value[key])) {
        return walk(value[key] as Plain, here);
      }

      return [here.join('.')];
    });

  return walk(options, []);
};

/* ---------------------------------------------------------------------------------------------
 * The engine
 * ------------------------------------------------------------------------------------------- */

type Context = Awaited<Auth['$context']>;
type StoredUser = NonNullable<Awaited<ReturnType<Context['internalAdapter']['findUserById']>>>;
type StoredSession = Awaited<ReturnType<Context['internalAdapter']['listSessions']>>[number];
type StoredAccount = Awaited<ReturnType<Context['internalAdapter']['findAccounts']>>[number];

const toDate = (value: Date | string | number) => (value instanceof Date ? value : new Date(value));

const toEngineSession = (session: StoredSession): EngineSession => {
  const { impersonatedBy, ipAddress, userAgent, deviceId, twoFactorVerified } =
    session as StoredSession & {
      impersonatedBy?: string | null;
      deviceId?: string | null;
      twoFactorVerified?: boolean | null;
    };

  return {
    id: session.id,
    userId: session.userId,
    token: session.token,
    expiresAt: toDate(session.expiresAt),
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
    deviceId: deviceId ?? null,
    impersonatedBy: impersonatedBy ?? null,
    passedSecondFactor: twoFactorVerified === true,
    createdAt: toDate(session.createdAt),
    updatedAt: toDate(session.updatedAt),
  };
};

/** Only what the boundary promises: no password, no provider token. */
const toEngineAccount = (account: StoredAccount): EngineAccount => ({
  id: account.id,
  userId: account.userId,
  providerId: account.providerId,
  accountId: account.accountId,
  scope: account.scope ?? null,
  createdAt: toDate(account.createdAt),
  updatedAt: toDate(account.updatedAt),
});

/**
 * `Authorization: Bearer ...`: the scheme in any case, then whitespace or the end of the value.
 *
 * The one rule for "this is a Bearer request". It is wider than the bearer plugin's own test (the
 * first seven characters, lower-cased, are `bearer `), so every header the plugin reads is one
 * here, and so is a header it would skip (`Bearer` with no token, `Bearer<TAB>token`). Skipped by
 * the plugin, such a header would leave the request to the cookie; here the cookie is taken away
 * from it too, and it is refused.
 */
const BEARER_SCHEME = /^bearer(?:\s|$)/i;

const isBearerRequest = (headers: Headers) =>
  BEARER_SCHEME.test(headers.get('authorization') ?? '');

/**
 * The `name=value` pairs of the Cookie header, split as Better Auth's cookie parsers split them: on
 * `;`, the name up to the first `=`, trimmed.
 */
const cookiePairs = (headers: Headers) =>
  (headers.get('cookie') ?? '').split(';').map((pair) => {
    const separator = pair.indexOf('=');

    return separator === -1
      ? { pair, name: pair.trim(), value: '' }
      : { pair, name: pair.slice(0, separator).trim(), value: pair.slice(separator + 1).trim() };
  });

/**
 * Whether the request names a session with a non-empty cookie of this name. A cookie of any other
 * name (an analytics cookie on the same site) is not credentials for this engine.
 */
const hasCookie = (headers: Headers, cookieName: string) =>
  cookiePairs(headers).some(({ name, value }) => name === cookieName && value !== '');

/**
 * Every cookie the engine reads a session from: the session token, the session cache
 * (`session_data`), "don't remember me" and the account cache, each also split in numbered chunks
 * (`<name>.0`, `<name>.1`, ...). The names are the engine's own, so a custom prefix or the
 * `__Secure-` prefix on HTTPS is followed.
 */
const sessionCookieNames = (ctx: Context) => {
  const { sessionToken, sessionData, dontRememberToken, accountData } = ctx.authCookies;

  return [sessionToken, sessionData, dontRememberToken, accountData].map(({ name }) => name);
};

/** The headers with those cookies left out; every other cookie stays as it was sent. */
const withoutCookies = (headers: Headers, names: string[]) => {
  const result = new Headers(headers);

  if (!headers.has('cookie')) {
    return result;
  }

  const kept = cookiePairs(headers)
    .filter(({ name }) => !names.some((own) => name === own || name.startsWith(`${own}.`)))
    .map(({ pair }) => pair);

  if (kept.join('').trim() === '') {
    result.delete('cookie');
  } else {
    result.set('cookie', kept.join(';'));
  }

  return result;
};

/**
 * A `Set-Cookie` value that removes its cookie: `Max-Age` of zero or less, or, without a
 * `Max-Age`, an `Expires` that has passed. `Max-Age` wins over `Expires`, as in a browser.
 */
const isClearingCookie = (setCookie: string) => {
  let maxAge: number | undefined;
  let expires: number | undefined;

  for (const attribute of setCookie.split(';').slice(1)) {
    const separator = attribute.indexOf('=');
    const key = (separator === -1 ? attribute : attribute.slice(0, separator)).trim().toLowerCase();
    const value = separator === -1 ? '' : attribute.slice(separator + 1).trim();

    if (key === 'max-age') {
      maxAge = Number.parseInt(value, 10);
    } else if (key === 'expires') {
      expires = Date.parse(value);
    }
  }

  if (maxAge !== undefined && !Number.isNaN(maxAge)) {
    return maxAge <= 0;
  }

  return expires !== undefined && !Number.isNaN(expires) && expires <= Date.now();
};

/**
 * The response headers Better Auth had set when an `auth.api` call threw: its cookie writes before
 * the throw (better-call keeps them on the error, under this registered symbol).
 */
const API_ERROR_HEADERS = Symbol.for('better-call:api-error-headers');

const headersOfError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const headers = (error as Record<symbol, unknown>)[API_ERROR_HEADERS];

  return headers instanceof Headers ? headers : undefined;
};

/** The error Better Auth's `auth.api` throws, as the Strapi error with the same meaning. */
const toStrapiError = (error: unknown) => {
  const { name, statusCode, message, body } = (error ?? {}) as {
    name?: string;
    statusCode?: number;
    message?: string;
    body?: { code?: string };
  };

  if (name !== 'APIError' || typeof statusCode !== 'number') {
    return error;
  }

  const details = body?.code ? { code: body.code } : {};

  switch (statusCode) {
    case 401:
      return new errors.UnauthorizedError(message, details);
    case 403:
      return new errors.ForbiddenError(message, details);
    case 404:
      return new errors.NotFoundError(message, details);
    default:
      return statusCode >= 400 && statusCode < 500
        ? new errors.ApplicationError(message, details)
        : error;
  }
};

const callApi = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw toStrapiError(error);
  }
};

/** The plugin ids that make a sign-in method, by the name the admin shows it under. */
const METHOD_PLUGINS: Array<[string, InstalledMethod]> = [
  ['username', 'username'],
  ['two-factor', 'twoFactor'],
  ['magic-link', 'magicLink'],
  ['email-otp', 'emailOtp'],
  ['passkey', 'passkey'],
];

const installedMethodsOf = (options: BetterAuthOptions): InstalledMethod[] => {
  const ids = new Set((options.plugins ?? []).map((plugin) => plugin.id as string));
  const methods = METHOD_PLUGINS.filter(([id]) => ids.has(id)).map(([, method]) => method);

  return options.emailAndPassword?.enabled === false ? methods : ['emailPassword', ...methods];
};

/**
 * Waits for `pending` for at most `budgetMs`, and rejects with a fixed message after that: whatever
 * `pending` goes on to do is ignored.
 */
const withinBudget = async (pending: Promise<unknown>, budgetMs: number) => {
  let timer: NodeJS.Timeout | undefined;

  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `a provider's discovery document did not answer within ${Math.round(budgetMs / 1000)} seconds`
          )
        ),
      budgetMs
    );
  });

  // Whatever the abandoned build ends in is not a failure of anything that is waiting
  pending.catch(() => undefined);

  try {
    await Promise.race([pending, expired]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Builds a Better Auth instance and implements `AuthEngine` on it. `reload` builds another from
 * the same project options and swaps to it.
 *
 * `projectAuth` is the project's `auth` option, read from the plugin configuration when it is not
 * given. `inputs` are the start-up settings the first instance is built from.
 */
export const createEngine = (
  strapi: Core.Strapi,
  projectAuth?: DefineAuthResult,
  inputs: StartupInputs = emptyStartupInputs()
): AuthEngine => {
  const project = projectAuth ?? loadProjectAuth(strapi);
  let options = buildAuthOptions(strapi, project, inputs);

  const experimental = experimentalAuthOptions(project);

  if (experimental.length > 0) {
    strapi.log.warn(
      `${PLUGIN_ID}: \`auth\` in config/plugins.ts sets ${experimental.join(', ')}. Talking to ` +
        'Better Auth directly is experimental and not supported: only `plugins` and the email ' +
        'senders are.'
    );
  }

  turnTelemetryOff(strapi);

  let auth: Auth = betterAuth(options);

  if (
    process.env.NODE_ENV === 'production' &&
    !strapi.config.get<string | undefined>('server.url')
  ) {
    strapi.log.warn(
      `${PLUGIN_ID}: server.url is not set, so links in emails and redirects are built on ` +
        `${options.baseURL}, the address Strapi derives from its host and port. Set \`url\` in ` +
        "config/server.js to the server's public URL."
    );
  }

  // Better Auth starts up in the background. A failure is reported here and again, as the
  // rejection, by whatever uses the engine.
  auth.$context.catch((error: unknown) => {
    strapi.log.error(`${PLUGIN_ID}: Better Auth failed to start: ${(error as Error)?.message}`);
  });

  const context = () => auth.$context;

  /**
   * A link the engine emails may only send the user to this server, a trusted origin or a path.
   * Better Auth checks that in its router, which these calls do not go through (see below), so it
   * is checked here, with the same rule and the same list.
   */
  const assertTrustedRedirect = async (url: string) => {
    const ctx = await context();

    if (typeof url !== 'string' || !ctx.isTrustedOrigin(url, { allowRelativePaths: true })) {
      throw new errors.ForbiddenError('Invalid redirect URL', { code: 'INVALID_REDIRECT_URL' });
    }
  };

  /*
   * The emails the engine sends on its own (an administrator sends a reset link) call `auth.api`
   * directly, not the handler. The router would rate-limit them as one client (there is no client
   * address, so every one of them lands in the same bucket, three a minute for the whole
   * application) and a captcha the project turned on would refuse them: both are guards for a
   * request that came from outside. The links are absolute because `baseURL` is always set.
   */

  const requireUser = async (ctx: Context, userId: ID) => {
    const user = await ctx.internalAdapter.findUserById(userId);

    if (!user) {
      throw new errors.NotFoundError('User not found');
    }

    return user;
  };

  const clearBan = async (ctx: Context, userId: ID) => {
    await ctx.internalAdapter.updateUser(userId, {
      banned: false,
      banReason: null,
      banExpires: null,
    });
  };

  // A Users & Permissions token is not a session: it is never found here. The Content API strategy
  // checks a Bearer value that comes back with no session against those tokens, and counts the
  // hit in the plugin's own store (the `compat` service), never in the engine's tables.
  const lookupSession = async (headers: Headers): Promise<SessionLookup> => {
    // A reload may swap `auth` while this awaits: the lookup finishes on the instance it started on
    const instance = auth;
    const ctx = await instance.$context;
    const cookieName = ctx.authCookies.sessionToken.name;

    let source: CredentialSource | null = null;
    let sent = headers;

    if (isBearerRequest(headers)) {
      source = 'bearer';
      // The Bearer header decides alone. The bearer plugin leaves the request as it is when the
      // token fails its signature check, is empty, or is not written `Bearer <token>`, and a
      // session cookie sent with it would then answer for it: a bad token, a good cookie, signed
      // in. Without the cookies, a token the plugin does not turn into a session is no session.
      sent = withoutCookies(headers, sessionCookieNames(ctx));
    } else if (hasCookie(headers, cookieName)) {
      source = 'cookie';
    }

    let found: Awaited<ReturnType<Auth['api']['getSession']>> | null = null;
    let responseHeaders: Headers | undefined;

    try {
      // Always from the database: the cookie cache would keep a revoked or banned session alive
      // for as long as it lasts, and this is what decides who may do what.
      const result = await instance.api.getSession({
        headers: sent,
        query: { disableCookieCache: true },
        returnHeaders: true,
      });

      found = result.response;
      responseHeaders = result.headers;
    } catch (error) {
      const converted = toStrapiError(error);

      // Better Auth answers 401 when it could not extend a session it had just found (it was
      // deleted in between): the session is gone, which is what null says. The cookies it cleared
      // before it threw come with the error.
      if (!(converted instanceof errors.UnauthorizedError)) {
        throw converted;
      }

      responseHeaders = headersOfError(error);
    }

    const cookies = responseHeaders?.getSetCookie() ?? [];

    if (!found?.session) {
      return {
        session: null,
        credentials: source !== null,
        source,
        // A session cookie Better Auth found to be stale (expired, revoked) is cleared, so the
        // client stops sending a cookie that only ever gets a 401. Only the clearing cookies: the
        // cache cookies it may also write are not worth a header. Never for a Bearer request,
        // whose cookie was the bearer plugin's doing, not the client's.
        setCookies: source === 'cookie' ? cookies.filter(isClearingCookie) : [],
      };
    }

    // Only a session that was extended comes with its token cookie. The cookie cache (when the
    // project turned it on) is also set on every read, and is not worth a header per request.
    const extended = cookies.some((cookie) => cookie.startsWith(`${cookieName}=`));

    return {
      session: toEngineSession(found.session as StoredSession),
      credentials: true,
      // A session with no Bearer header came from the cookie, whatever the cookie test above made
      // of it: when in doubt, the source that gets the origin check
      source: source ?? 'cookie',
      setCookies: extended ? cookies : [],
    };
  };

  /**
   * Better Auth's own matcher (`isTrustedOrigin` of its context, which applies
   * `matchesOriginPattern` to the trusted origins: the server's origin, the configured list,
   * wildcards included), as its origin check (`validateOrigin`, in
   * `better-auth/dist/api/middlewares/origin-check.mjs`) applies it to a request with a cookie:
   * the `Origin` or `Referer` value as sent, no relative paths.
   */
  const isTrustedOrigin = async (origin: string) => {
    if (typeof origin !== 'string' || origin === '') {
      return false;
    }

    const ctx = await context();

    try {
      return ctx.isTrustedOrigin(origin);
    } catch {
      return false;
    }
  };

  // The tables the plugin turned into content types at register(): a reload never changes them
  const firstOptions = options;

  const reload = async (next: StartupInputs) => {
    let candidate: Auth;
    let candidateOptions: BetterAuthOptions;

    try {
      candidateOptions = buildAuthOptions(strapi, project, next);
      candidate = betterAuth(candidateOptions);

      // Better Auth fetches each generic provider's discovery document while it builds, one after
      // the other and with no time limit, and every `/api/auth` request waits for a rebuild. A
      // provider that does not answer fails the rebuild instead of holding the requests: the
      // engine in place keeps serving.
      await withinBudget(
        candidate.$context,
        DISCOVERY_TIMEOUT_MS * Math.max(1, next.providers.genericOAuth.length)
      );
    } catch (error) {
      throw new errors.ValidationError((error as Error)?.message ?? String(error));
    }

    options = candidateOptions;
    auth = candidate;
  };

  return {
    schema() {
      // The rate-limit table is always created, whichever storage Better Auth's own rate limiter
      // uses, so choosing the other storage later changes no table
      return fromAuthTables(
        getAuthTables({
          ...firstOptions,
          rateLimit: { ...firstOptions.rateLimit, storage: 'database' },
        })
      );
    },

    async handle(request: Request) {
      const response = await auth.handler(request);

      return readCompatConfig(strapi).usersPermissions
        ? compatRateLimitResponse(
            response,
            new URL(request.url).pathname,
            resolveBasePath(strapi.config)
          )
        : response;
    },

    async callNative<K extends NativeEndpoint>(
      endpoint: K,
      input: { body?: unknown; query?: unknown; headers: Headers }
    ) {
      // The instance this call starts on answers it, whatever a reload swaps in meanwhile
      const instance = auth;
      const call = (
        instance.api as unknown as Record<string, (context: Plain) => Promise<unknown>>
      )[endpoint];

      // A refusal is thrown as Better Auth gave it: the compat route reads its code
      const result = (await call({
        ...(input.body !== undefined && { body: input.body }),
        ...(input.query !== undefined && { query: input.query }),
        headers: input.headers,
        returnHeaders: true,
      })) as { headers: Headers; response: NativeResult<K> };

      return { headers: result.headers, response: result.response };
    },

    getSession: async (headers: Headers) => (await lookupSession(headers)).session,

    lookupSession,

    isTrustedOrigin,

    async createSession(userId: ID, meta: RequestMeta) {
      const ctx = await context();
      const user = await requireUser(ctx, userId);
      const ban = banState(user as StoredUser & { banned?: unknown; banExpires?: unknown });

      // Better Auth checks for a ban when a session is created inside one of its endpoints, and not
      // here, where there is no request.
      if (ban === 'active') {
        throw new errors.ForbiddenError('You have been banned from this application.', {
          code: 'USER_BANNED',
        });
      }

      if (ban === 'expired') {
        await clearBan(ctx, userId);
      }

      const request: Record<string, string> = {};

      if (meta.ipAddress != null) request.ipAddress = meta.ipAddress;
      if (meta.userAgent != null) request.userAgent = meta.userAgent;
      if (meta.deviceId) request.deviceId = meta.deviceId;

      // A session that replaces one that passed a second factor keeps that. Better Auth gives a new
      // session the field's default over what is passed, unless asked for the passed values to win.
      const session = await ctx.internalAdapter.createSession(
        userId,
        false,
        meta.passedSecondFactor ? { ...request, twoFactorVerified: true } : request,
        meta.passedSecondFactor === true
      );

      if (!session) {
        throw new Error('Better Auth did not create the session.');
      }

      return toEngineSession(session as StoredSession);
    },

    async revokeSessions(userId: ID, opts?: { except?: ID }) {
      const ctx = await context();

      // The old Users & Permissions sessions are never the one to keep
      await revokeLegacySessions(strapi, String(userId));

      if (!opts?.except) {
        await ctx.internalAdapter.deleteUserSessions(userId);

        return;
      }

      const sessions = await ctx.internalAdapter.listSessions(userId);
      const tokens = sessions.filter(({ id }) => id !== opts.except).map(({ token }) => token);

      if (tokens.length > 0) {
        await ctx.internalAdapter.deleteSessions(tokens);
      }
    },

    async revokeDevice(userId: ID, deviceId: string) {
      const ctx = await context();
      const sessions = await ctx.internalAdapter.listSessions(userId);
      const tokens = sessions
        .filter((session) => (session as { deviceId?: string | null }).deviceId === deviceId)
        .map(({ token }) => token);

      if (tokens.length > 0) {
        await ctx.internalAdapter.deleteSessions(tokens);
      }
    },

    async revokeSession(userId: ID, sessionId: ID) {
      const ctx = await context();
      const sessions = await ctx.internalAdapter.listSessions(userId);
      const session = sessions.find(({ id }) => id === sessionId);

      if (!session) {
        throw new errors.NotFoundError('Session not found');
      }

      await ctx.internalAdapter.deleteSession(session.token);
    },

    async claimSession(userId: ID, sessionId: ID) {
      const ctx = await context();
      const sessions = await ctx.internalAdapter.listSessions(userId);
      const session = sessions.find(({ id }) => id === sessionId);

      if (!session) {
        return null;
      }

      // One statement with the id and the user in its where: of several claimants, one removes the
      // row and gets a count of 1
      const removed = await ctx.adapter.deleteMany({
        model: 'session',
        where: [
          { field: 'id', value: sessionId },
          { field: 'userId', value: userId },
        ],
      });

      return removed === 1 ? toEngineSession(session) : null;
    },

    async markProviderSession(sessionId: ID, provider: string) {
      const ctx = await context();

      await ctx.internalAdapter.createVerificationValue({
        identifier: providerSessionMark(provider, sessionId),
        value: sessionId,
        expiresAt: new Date(Date.now() + PROVIDER_SESSION_MARK_MS),
      });
    },

    async claimProviderSession(sessionId: ID, provider: string) {
      const ctx = await context();
      const removed = await ctx.adapter.deleteMany({
        model: 'verification',
        where: [
          { field: 'identifier', value: providerSessionMark(provider, sessionId) },
          { field: 'expiresAt', value: new Date(), operator: 'gt' },
        ],
      });

      return removed === 1;
    },

    async listSessions(userId: ID) {
      const ctx = await context();
      const sessions = await ctx.internalAdapter.listSessions(userId, { onlyActiveSessions: true });

      return sessions.map((session) => toEngineSession(session));
    },

    async listAccounts(userId: ID) {
      const ctx = await context();
      const accounts = await ctx.internalAdapter.findAccounts(userId);

      return accounts.map((account) => toEngineAccount(account));
    },

    async unlinkAccount(userId: ID, accountId: ID) {
      const ctx = await context();
      const accounts = await ctx.internalAdapter.findAccounts(userId);

      if (!accounts.some(({ id }) => id === accountId)) {
        throw new errors.NotFoundError('Account not found');
      }

      if (accounts.length <= 1) {
        throw new errors.ApplicationError('The last sign-in method of a user cannot be removed.');
      }

      await ctx.internalAdapter.deleteAccount(accountId);
    },

    async hashPassword(plain: string) {
      const ctx = await context();

      return ctx.password.hash(plain);
    },

    async verifyPassword(hash: string, plain: string) {
      const ctx = await context();

      return ctx.password.verify({ hash, password: plain });
    },

    async setPassword(userId: ID, plain: string) {
      const ctx = await context();
      const { passwords } = await (
        strapi.plugin(PLUGIN_ID).service('settings') as ReturnType<typeof settingsService>
      ).get();
      const problem = passwordProblem(plain, passwords, {
        bcrypt: readCompatConfig(strapi).usersPermissions,
      });

      if (problem) {
        throw new errors.ValidationError(problem);
      }

      await requireUser(ctx, userId);

      const hash = await ctx.password.hash(plain);

      if (await ctx.internalAdapter.findCredentialAccount(userId)) {
        await ctx.internalAdapter.updatePassword(userId, hash);

        return;
      }

      await ctx.internalAdapter.linkAccount({
        userId,
        providerId: 'credential',
        accountId: userId,
        password: hash,
      });
    },

    async sendPasswordReset(email: string, redirectTo: string) {
      await assertTrustedRedirect(redirectTo);
      await callApi(() => auth.api.requestPasswordReset({ body: { email, redirectTo } }));
    },

    async sendVerificationEmail(userId: ID, redirectTo: string) {
      const ctx = await context();
      const user = await requireUser(ctx, userId);

      await assertTrustedRedirect(redirectTo);
      await callApi(() =>
        auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: redirectTo } })
      );
    },

    async resetTwoFactor(userId: ID) {
      const ctx = await context();

      await requireUser(ctx, userId);
      await ctx.adapter.deleteMany({
        model: 'twoFactor',
        where: [{ field: 'userId', value: userId }],
      });
      await ctx.internalAdapter.updateUser(userId, { twoFactorEnabled: false });
      // A device trusted before the reset would skip the second factor the user enrols next
      await ctx.adapter.deleteMany({
        model: 'verification',
        where: [
          { field: 'value', value: userId },
          { field: 'identifier', value: TRUST_DEVICE_PREFIX, operator: 'starts_with' },
        ],
      });
      await ctx.internalAdapter.deleteUserSessions(userId);
    },

    async ban(userId: ID, reason?: string, expiresAt?: Date) {
      const ctx = await context();

      await requireUser(ctx, userId);
      await ctx.internalAdapter.updateUser(userId, {
        banned: true,
        banReason: reason ?? null,
        banExpires: expiresAt ?? null,
      });
      await ctx.internalAdapter.deleteUserSessions(userId);
    },

    async unban(userId: ID) {
      const ctx = await context();

      await requireUser(ctx, userId);
      await clearBan(ctx, userId);
    },

    async unlock(userId: ID) {
      const ctx = await context();

      const user = await requireUser(ctx, userId);

      await clearAttempts(strapi, keyOfAccount((user as { email: string }).email));
      await ctx.internalAdapter.updateUser(userId, { failedSignIns: 0, lockedUntil: null });
    },

    reload,

    installedMethods: () => installedMethodsOf(options),
  };
};
