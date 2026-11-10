import { isDefineAuthResult } from '../engine/better-auth/define-auth';
import { DUPLICATES_MODES, MAX_FIELD_LENGTH, MAX_REGISTRATION_FIELDS } from '../migration/config';
import { parseDuration } from './duration';
import {
  hasBackslash,
  matchesHostPrefix,
  originsFromEnv,
  TRUSTED_ORIGINS_ENV,
  trustsEveryOrigin,
} from './trusted-origins';
import { isPlain } from '../utils/is-plain';

type Plain = Record<string, unknown>;

// Written by hand rather than with a yup schema: the messages are the product. A project owner
// reads them at boot and in the migration report, each names the key and the value it got, and the
// tests and docs quote them word for word. A schema would give them its own wording.

const invalid = (key: string, expected: string, value: unknown): never => {
  throw new Error(
    `Invalid end-users configuration: \`${key}\` must be ${expected}, got ${JSON.stringify(value)}.`
  );
};

/** The group at `key` (an object), or an empty one when it is not set. */
const group = (parent: Plain, name: string, path = name): Plain => {
  const value = parent[name];

  if (value === undefined || value === null) {
    return {};
  }

  if (!isPlain(value)) {
    return invalid(path, 'an object', value);
  }

  return value;
};

const optionalBoolean = (parent: Plain, name: string, path: string) => {
  const value = parent[name];

  if (value !== undefined && value !== null && typeof value !== 'boolean') {
    invalid(path, 'true or false', value);
  }
};

const optionalString = (parent: Plain, name: string, path: string) => {
  const value = parent[name];

  if (value !== undefined && value !== null && typeof value !== 'string') {
    invalid(path, 'a string', value);
  }
};

const optionalPositiveInteger = (parent: Plain, name: string, path: string, what: string) => {
  const value = parent[name];

  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    invalid(path, `${what}, a whole number of 1 or more`, value);
  }
};

/**
 * Better Auth's own shape: an object keyed by path, each rule `{ window, max }`, a function that
 * returns one, or `false` to leave the path out of the limit.
 */
const validateCustomRules = (rules: unknown) => {
  if (rules === undefined || rules === null) {
    return;
  }

  if (!isPlain(rules)) {
    invalid('rateLimit.customRules', 'an object keyed by path', rules);
    return;
  }

  for (const [path, rule] of Object.entries(rules)) {
    const key = `rateLimit.customRules[${JSON.stringify(path)}]`;

    if (rule === false || typeof rule === 'function') {
      // eslint-disable-next-line no-continue
      continue;
    }

    if (!isPlain(rule)) {
      invalid(key, '{ window, max }, a function, or false', rule);
    } else {
      optionalPositiveInteger(rule, 'window', `${key}.window`, 'a number of seconds');
      optionalPositiveInteger(rule, 'max', `${key}.max`, 'a number of requests');
    }
  }
};

const optionalDuration = (parent: Plain, name: string, path: string, allowOff = false) => {
  const value = parent[name];

  if (value === undefined || value === null || (allowOff && value === false)) {
    return;
  }

  if (parseDuration(value) === undefined) {
    invalid(
      path,
      `a duration: a number of seconds, or a number and a unit such as "7d", "12h" or "5m"${
        allowOff ? ', or false' : ''
      }`,
      value
    );
  }
};

/** Why an entry with a backslash is refused, and what to write instead. */
const BACKSLASH_WHY =
  "but trusted origins can't contain a backslash: no real origin has one, and Better Auth " +
  'reads it as an escape, which can hide a wildcard from anyone reading the entry (a host that ' +
  'ends in `*` after an escaped dot still trusts every host that starts the same way). Write ' +
  'the origin without it, for example "https://app.example.com".';

/** Why an entry that matches a host by its start is refused, and what to write instead. */
const HOST_PREFIX_WHY =
  'which Better Auth reads as the start of a host: it also trusts every host that begins with ' +
  'the same text, such as "app.example.com.evil.net" (anyone can register a name like it), and ' +
  'a page there could use the session cookie. An origin has no path, and a wildcard must not ' +
  'end the host. Write "https://app.example.com", or anchor the wildcard with the end of the ' +
  'host, as in "https://*.example.com".';

/**
 * `providers`: a list whose entries are a package name (installed, then configured in the admin) or
 * `{ provider, options, enabled? }` (configured here, locked in the admin). That a package can be
 * loaded, and what `options` must hold, depend on the provider, so the registry judges those when
 * the application starts.
 */
const validateProviders = (providers: unknown) => {
  if (providers === undefined || providers === null) {
    return;
  }

  if (!Array.isArray(providers)) {
    invalid(
      'providers',
      'a list of provider package names and { provider, options } entries',
      providers
    );
    return;
  }

  providers.forEach((entry, index) => {
    const key = `providers[${index}]`;

    if (typeof entry === 'string') {
      if (entry.trim() === '') {
        invalid(key, 'a package name, or { provider, options, enabled? }', entry);
      }

      return;
    }

    if (!isPlain(entry)) {
      invalid(key, 'a package name, or { provider, options, enabled? }', entry);
      return;
    }

    if (typeof entry.provider !== 'string' || entry.provider.trim() === '') {
      invalid(`${key}.provider`, 'the id of a built-in provider or a package name', entry.provider);
    }

    if (!isPlain(entry.options)) {
      invalid(
        `${key}.options`,
        "an object with clientId, clientSecret and the provider's own options",
        entry.options
      );
    }

    optionalBoolean(entry, 'enabled', `${key}.enabled`);
  });
};

const LEGACY_JWT_ALGORITHMS = new Set(['HS256', 'HS384', 'HS512']);
const SAME_SITE_VALUES = new Set(['lax', 'strict', 'none']);

const LEGACY_JWT_CUTOFF = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

const isAbsoluteUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * `compat`: the Users & Permissions compatibility mode. That a callback's origin is trusted is
 * judged when the application starts, against the server's address and Better Auth's own matcher.
 */
const validateCompat = (compat: Plain) => {
  const legacyJwt = group(compat, 'legacyJwt', 'compat.legacyJwt');
  const refresh = group(compat, 'refresh', 'compat.refresh');
  const cookie = group(refresh, 'cookie', 'compat.refresh.cookie');
  const connect = group(compat, 'connect', 'compat.connect');

  optionalBoolean(compat, 'usersPermissions', 'compat.usersPermissions');
  optionalString(legacyJwt, 'secret', 'compat.legacyJwt.secret');

  const { until, algorithm } = legacyJwt;

  if (
    until !== undefined &&
    until !== null &&
    (typeof until !== 'string' || !LEGACY_JWT_CUTOFF.test(until) || Number.isNaN(Date.parse(until)))
  ) {
    invalid('compat.legacyJwt.until', 'a date such as "2027-06-30", or null', until);
  }

  if (until !== undefined && until !== null && !legacyJwt.secret) {
    throw new Error(
      'Invalid end-users configuration: `compat.legacyJwt.until` is set, so `compat.legacyJwt.secret` ' +
        'must be a non-empty string (the secret the old tokens were signed with, the JWT_SECRET ' +
        'environment variable by default).'
    );
  }

  if (
    algorithm !== undefined &&
    algorithm !== null &&
    !LEGACY_JWT_ALGORITHMS.has(algorithm as string)
  ) {
    invalid('compat.legacyJwt.algorithm', '"HS256", "HS384" or "HS512"', algorithm);
  }

  optionalBoolean(refresh, 'enabled', 'compat.refresh.enabled');
  optionalBoolean(refresh, 'httpOnly', 'compat.refresh.httpOnly');
  optionalString(cookie, 'name', 'compat.refresh.cookie.name');
  optionalBoolean(cookie, 'secure', 'compat.refresh.cookie.secure');
  optionalString(cookie, 'path', 'compat.refresh.cookie.path');
  optionalString(cookie, 'domain', 'compat.refresh.cookie.domain');
  optionalPositiveInteger(cookie, 'maxAge', 'compat.refresh.cookie.maxAge', 'a number of seconds');

  const { sameSite } = cookie;

  if (sameSite !== undefined && sameSite !== null && !SAME_SITE_VALUES.has(sameSite as string)) {
    invalid('compat.refresh.cookie.sameSite', '"lax", "strict" or "none"', sameSite);
  }

  const { callbacks } = connect;

  if (callbacks === undefined || callbacks === null) {
    return;
  }

  if (!isPlain(callbacks)) {
    invalid('compat.connect.callbacks', 'an object of provider ids and URLs', callbacks);
    return;
  }

  for (const [provider, url] of Object.entries(callbacks)) {
    const key = `compat.connect.callbacks[${JSON.stringify(provider)}]`;

    if (typeof url !== 'string' || !isAbsoluteUrl(url)) {
      invalid(key, 'an absolute http or https URL', url);
    }
  }
};

/** `migration`: the migration from Users & Permissions. */
const validateMigration = (migration: Plain) => {
  const { fromUsersPermissions, duplicates, registrationFields } = migration;

  if (
    fromUsersPermissions !== undefined &&
    fromUsersPermissions !== null &&
    typeof fromUsersPermissions !== 'boolean' &&
    fromUsersPermissions !== 'check'
  ) {
    invalid(
      'migration.fromUsersPermissions',
      'true, false, "check", or null',
      fromUsersPermissions
    );
  }

  if (
    duplicates !== undefined &&
    duplicates !== null &&
    !DUPLICATES_MODES.includes(duplicates as (typeof DUPLICATES_MODES)[number])
  ) {
    invalid('migration.duplicates', '"keep-oldest" or "abort"', duplicates);
  }

  if (registrationFields !== undefined && registrationFields !== null) {
    if (
      !Array.isArray(registrationFields) ||
      registrationFields.length > MAX_REGISTRATION_FIELDS ||
      registrationFields.some(
        (name) => typeof name !== 'string' || name === '' || name.length > MAX_FIELD_LENGTH
      )
    ) {
      invalid(
        'migration.registrationFields',
        `a list of at most ${MAX_REGISTRATION_FIELDS} field names, each up to ${MAX_FIELD_LENGTH} characters`,
        registrationFields
      );
    }
  }

  optionalBoolean(migration, 'rollback', 'migration.rollback');
};

/**
 * Checks the plugin configuration after the defaults are merged in. Keys it
 * does not know are left alone: a project may add its own.
 *
 * `envVars` is the environment to judge by, so the rule that depends on it can be tested.
 */
export const validateConfig = (
  config: unknown,
  envVars: Record<string, string | undefined> = process.env
): void => {
  const values: Plain = isPlain(config) ? config : {};

  const { secret } = values;

  if (secret !== undefined && secret !== null && typeof secret !== 'string') {
    invalid('secret', 'a string', secret);
  }

  if (envVars.NODE_ENV === 'production' && !secret) {
    throw new Error(
      'Invalid end-users configuration: `secret` is required in production. It signs the ' +
        'sessions, so set the END_USERS_SECRET environment variable (a long random string), or ' +
        '`secret` in config/plugins.js.'
    );
  }

  optionalString(values, 'appName', 'appName');

  const { trustedOrigins } = values;

  if (trustedOrigins !== undefined && trustedOrigins !== null) {
    if (
      !Array.isArray(trustedOrigins) ||
      trustedOrigins.some((origin) => typeof origin !== 'string' || origin.trim() === '')
    ) {
      invalid(
        'trustedOrigins',
        'a list of origins, for example ["https://app.example.com"]',
        trustedOrigins
      );
    }

    const withBackslash = (trustedOrigins as string[]).find(hasBackslash);

    if (withBackslash !== undefined) {
      throw new Error(
        `Invalid end-users configuration: \`trustedOrigins\` has the entry ${JSON.stringify(
          withBackslash
        )}, ${BACKSLASH_WHY}`
      );
    }

    const everyOrigin = (trustedOrigins as string[]).find(trustsEveryOrigin);

    if (everyOrigin !== undefined) {
      throw new Error(
        `Invalid end-users configuration: \`trustedOrigins\` has the entry ${JSON.stringify(
          everyOrigin
        )}, which trusts every origin and so switches off the CSRF check on cookie sessions. ` +
          'List the origins of your front ends, for example ["https://app.example.com"], or a ' +
          'narrower pattern such as "https://*.example.com".'
      );
    }

    const byItsStart = (trustedOrigins as string[]).find(matchesHostPrefix);

    if (byItsStart !== undefined) {
      throw new Error(
        `Invalid end-users configuration: \`trustedOrigins\` has the entry ${JSON.stringify(
          byItsStart
        )}, ${HOST_PREFIX_WHY}`
      );
    }
  }

  // Better Auth adds this variable to the trusted origins, so it is held to the same rule
  const backslashFromEnv = originsFromEnv(envVars).find(hasBackslash);

  if (backslashFromEnv !== undefined) {
    throw new Error(
      `Invalid end-users configuration: the environment variable ${TRUSTED_ORIGINS_ENV} has the ` +
        `entry ${JSON.stringify(backslashFromEnv)}, ${BACKSLASH_WHY}`
    );
  }

  const everyOriginFromEnv = originsFromEnv(envVars).find(trustsEveryOrigin);

  if (everyOriginFromEnv !== undefined) {
    throw new Error(
      `Invalid end-users configuration: the environment variable ${TRUSTED_ORIGINS_ENV} has the ` +
        `entry ${JSON.stringify(everyOriginFromEnv)}, which trusts every origin and so switches ` +
        'off the CSRF check on cookie sessions (Better Auth adds the variable to the trusted ' +
        'origins). Remove it and list the origins of your front ends as `trustedOrigins` in ' +
        'config/plugins.js, or use a narrower pattern such as "https://*.example.com".'
    );
  }

  const prefixFromEnv = originsFromEnv(envVars).find(matchesHostPrefix);

  if (prefixFromEnv !== undefined) {
    throw new Error(
      `Invalid end-users configuration: the environment variable ${TRUSTED_ORIGINS_ENV} has the ` +
        `entry ${JSON.stringify(prefixFromEnv)}, ${HOST_PREFIX_WHY}`
    );
  }

  const cookies = group(values, 'cookies');

  optionalBoolean(cookies, 'crossSite', 'cookies.crossSite');
  optionalString(cookies, 'domain', 'cookies.domain');

  const session = group(values, 'session');

  optionalDuration(session, 'expiresIn', 'session.expiresIn');
  optionalDuration(session, 'updateAge', 'session.updateAge');
  optionalDuration(session, 'cookieCache', 'session.cookieCache', true);

  const rateLimit = group(values, 'rateLimit');
  const { storage } = rateLimit;

  optionalBoolean(rateLimit, 'enabled', 'rateLimit.enabled');
  optionalPositiveInteger(rateLimit, 'window', 'rateLimit.window', 'a number of seconds');
  optionalPositiveInteger(rateLimit, 'max', 'rateLimit.max', 'a number of requests');
  validateCustomRules(rateLimit.customRules);

  if (storage !== undefined && storage !== null && storage !== 'database' && storage !== 'memory') {
    invalid('rateLimit.storage', '"database" or "memory"', storage);
  }

  validateCompat(group(values, 'compat'));
  validateMigration(group(values, 'migration'));

  const { auth } = values;

  if (auth !== undefined && auth !== null && !isDefineAuthResult(auth)) {
    throw new Error(
      'Invalid end-users configuration: `auth` must be the result of defineAuth(), imported from ' +
        "'@strapi/plugin-end-users/auth', for example `auth: defineAuth({ plugins: [magicLink()] })`."
    );
  }

  validateProviders(values.providers);

  optionalBoolean(values, 'explain', 'explain');
};
