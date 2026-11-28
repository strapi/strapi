/**
 * `defineAuth()`, the one function a project's `config/plugins.ts` calls (as `'end-users'.config.auth`).
 *
 * The result is merged over the plugin's own Better Auth options by `createEngine` (project values
 * win, `plugins` are added after the plugin's). A few options are the plugin's alone because the
 * rest of it depends on them; they are refused here, in the type and at runtime (a plain JavaScript
 * project gets no type error).
 */
import type { BetterAuthAdvancedOptions, BetterAuthOptions } from 'better-auth';

/** What marks a value as the result of `defineAuth`. A string, so it survives two copies of this module. */
const KIND = 'end-users:auth';

const LOCKED_USER_MESSAGE =
  'The end-user type is locked. Add custom fields to plugin::end-users.profile instead.';

type UserOptions = NonNullable<BetterAuthOptions['user']>;
type SessionOptions = NonNullable<BetterAuthOptions['session']>;
type AccountOptions = NonNullable<BetterAuthOptions['account']>;
type VerificationOptions = NonNullable<BetterAuthOptions['verification']>;
type RateLimitOptions = NonNullable<BetterAuthOptions['rateLimit']>;
type EmailAndPasswordOptions = NonNullable<BetterAuthOptions['emailAndPassword']>;

/** The Better Auth options a project may set. */
export type ProjectAuthOptions = Omit<
  BetterAuthOptions,
  | 'database'
  | 'secret'
  | 'secrets'
  | 'baseURL'
  | 'basePath'
  | 'telemetry'
  | 'user'
  | 'session'
  | 'account'
  | 'verification'
  | 'rateLimit'
  | 'secondaryStorage'
  | 'advanced'
  | 'emailAndPassword'
  | 'emailVerification'
  | 'trustedOrigins'
> & {
  /**
   * Email and password sign-in is always on; these are the settings to add to it. Not here:
   * `requireEmailVerification`, `minPasswordLength`, `maxPasswordLength` and `disableSignUp`, which
   * are admin settings (Settings › End users › Sign-in).
   */
  emailAndPassword?: Omit<
    Partial<EmailAndPasswordOptions>,
    'requireEmailVerification' | 'minPasswordLength' | 'maxPasswordLength' | 'disableSignUp'
  >;
  /** `sendOnSignUp` is not here: it follows the admin's verification setting. */
  emailVerification?: Omit<NonNullable<BetterAuthOptions['emailVerification']>, 'sendOnSignUp'>;
  /**
   * `additionalFields` is not here: the end-user type is locked, custom fields go on the profile.
   * `fields` and `modelName` are not here either: they rename the attributes and the table.
   */
  user?: Omit<UserOptions, 'additionalFields' | 'fields' | 'modelName'>;
  /** `fields` and `modelName` are not here: they rename the attributes and the table. */
  session?: Omit<SessionOptions, 'fields' | 'modelName'>;
  account?: Omit<AccountOptions, 'fields' | 'modelName'>;
  /**
   * `fields` and `modelName` are not here (they rename the table). `storeIdentifier` is not either:
   * the engine finds the rows of a trusted device by their identifier.
   */
  verification?: Omit<VerificationOptions, 'fields' | 'modelName' | 'storeIdentifier'>;
  /**
   * `modelName` and `fields` are not here: they rename the rate limit table and its attributes.
   * `storage` takes `memory` and `database`; `secondary-storage` is not here either, because there
   * is no secondary storage.
   */
  rateLimit?: Omit<RateLimitOptions, 'fields' | 'modelName' | 'storage'> & {
    storage?: 'memory' | 'database';
  };
  /**
   * `database` is not here: the plugin stores ids and tables its own way. Neither are the two
   * switches that turn the origin and CSRF checks off: they stay on (`false` is all they take), and
   * the origins they check against are `trustedOrigins` in the plugin configuration.
   */
  advanced?: Omit<
    BetterAuthAdvancedOptions,
    'database' | 'disableOriginCheck' | 'disableCSRFCheck'
  > & {
    disableOriginCheck?: false;
    disableCSRFCheck?: false;
  };
};

export interface DefineAuthResult {
  readonly kind: typeof KIND;
  readonly options: ProjectAuthOptions;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isDefineAuthResult = (value: unknown): value is DefineAuthResult =>
  isRecord(value) && value.kind === KIND && isRecord(value.options);

/** The groups whose `fields` and `modelName` would rename a table or an attribute. */
const RENAMEABLE_GROUPS = ['user', 'session', 'account', 'verification'] as const;

/** The only way verification identifiers are stored that the engine can find them in. */
const PLAIN_IDENTIFIERS = 'plain';

const SIGN_IN_PAGE = 'Settings › End users › Sign-in';

/** What the Sign-in page of the admin sets, so no project option may. */
const refuseSignInSetting = (option: string, setting: string): never =>
  refuse(
    option,
    `It is ${setting}, an admin setting on the ${SIGN_IN_PAGE} page, changed while the ` +
      'application runs. Set it there.'
  );

const refuse = (option: string, why: string): never => {
  throw new Error(`defineAuth: \`${option}\` is not a project option. ${why}`);
};

export const defineAuth = (options: ProjectAuthOptions): DefineAuthResult => {
  const given: Record<string, unknown> = isRecord(options) ? options : {};

  if (isRecord(given.user) && 'additionalFields' in given.user) {
    throw new Error(LOCKED_USER_MESSAGE);
  }

  for (const group of RENAMEABLE_GROUPS) {
    const groupOptions = given[group];

    for (const key of ['fields', 'modelName']) {
      if (isRecord(groupOptions) && key in groupOptions) {
        refuse(
          `${group}.${key}`,
          'The tables and attributes of the end-user engine have fixed names: the email rule, ' +
            'the user in `ctx.state.user`, the compatibility routes and the migration read them by name.'
        );
      }
    }
  }

  if (isRecord(given.rateLimit)) {
    for (const key of ['fields', 'modelName']) {
      if (key in given.rateLimit) {
        refuse(
          `rateLimit.${key}`,
          'The rate limit table is read and written by name, and it is locked like the others.'
        );
      }
    }
  }

  // Resetting a user's two-factor authentication deletes the rows that mark a device as trusted. It
  // finds them by their identifier (`trust-device-...`), which a hashed identifier no longer shows.
  if (
    isRecord(given.verification) &&
    given.verification.storeIdentifier !== undefined &&
    given.verification.storeIdentifier !== PLAIN_IDENTIFIERS
  ) {
    refuse(
      'verification.storeIdentifier',
      'It must stay "plain": resetting two-factor authentication finds the trusted devices of ' +
        'a user by the identifier of their verification row, and a hashed identifier hides it, ' +
        'so a reset would leave every trusted device able to skip the new second factor.'
    );
  }

  // Not supported yet, with no option that makes it acceptable. With secondary storage Better Auth
  // keeps sessions, verification values and the rest there, and the engine's revokeSessions, ban and
  // two-factor reset delete through the database adapter, so they would miss every one of them.
  if (given.secondaryStorage !== undefined) {
    refuse(
      'secondaryStorage',
      "secondaryStorage isn't supported yet: sessions and verification values must live in the " +
        'database so Strapi can revoke them.'
    );
  }

  // The rate limit store that is kept in secondary storage: without one, nothing would be limited
  if (isRecord(given.rateLimit) && given.rateLimit.storage === 'secondary-storage') {
    refuse(
      'rateLimit.storage',
      'There is no secondaryStorage (see its refusal), so a rate limit kept there would limit ' +
        'nothing. Use "memory" or "database".'
    );
  }

  if (isRecord(given.emailAndPassword)) {
    const emailAndPassword = given.emailAndPassword;
    const settings: Array<[string, string]> = [
      ['requireEmailVerification', 'whether signing in needs a verified email'],
      ['minPasswordLength', 'the shortest password'],
      ['maxPasswordLength', 'the longest password'],
      ['disableSignUp', 'whether people can sign up'],
    ];

    for (const [key, setting] of settings) {
      if (key in emailAndPassword) {
        refuseSignInSetting(`emailAndPassword.${key}`, setting);
      }
    }
  }

  if (isRecord(given.emailVerification) && 'sendOnSignUp' in given.emailVerification) {
    refuseSignInSetting(
      'emailVerification.sendOnSignUp',
      'whether the verification email goes out at sign-up, which follows the verification setting'
    );
  }

  if ('telemetry' in given) {
    refuse('telemetry', 'There is no hosted service to report to: telemetry is always off.');
  }

  if ('database' in given) {
    refuse('database', 'The plugin stores everything through the Strapi adapter.');
  }

  if ('secret' in given || 'secrets' in given) {
    refuse(
      'secret',
      'Set it in the plugin configuration (`secret`, usually from END_USERS_SECRET).'
    );
  }

  if ('baseURL' in given) {
    refuse(
      'baseURL',
      'It is the server URL Strapi is configured with (`url` in config/server.js), so a link ' +
        "can never be built from the request's Host header."
    );
  }

  if ('basePath' in given) {
    refuse('basePath', 'The endpoints are served under /api/auth.');
  }

  if (isRecord(given.advanced) && 'database' in given.advanced) {
    refuse('advanced.database', 'Ids are Strapi documentIds, and joins are not supported.');
  }

  // The list of origins that may use a cookie session is the plugin configuration's, where it is
  // checked (a lone `*` is refused there); a second list here would be one nothing checks.
  if (given.trustedOrigins !== undefined) {
    refuse(
      'trustedOrigins',
      'Set it in config/plugins, as `end-users.config.trustedOrigins` (a list of origins), where ' +
        'it is validated: an entry that trusts every origin is refused there.'
    );
  }

  // These two make Better Auth stop asking where a request with a session cookie comes from, so
  // any website could use the cookie of a signed-in user.
  if (isRecord(given.advanced)) {
    for (const key of ['disableOriginCheck', 'disableCSRFCheck']) {
      if (given.advanced[key]) {
        refuse(
          `advanced.${key}`,
          'It would let any website act as a signed-in user. The origin and CSRF checks stay on; ' +
            'list your front ends as `trustedOrigins` (config/plugins, `end-users.config.trustedOrigins`) ' +
            'instead.'
        );
      }
    }
  }

  return { kind: KIND, options };
};
