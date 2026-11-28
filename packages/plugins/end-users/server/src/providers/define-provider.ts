/**
 * `defineProvider()`, the one function a provider package's default export is made with, and what
 * the registry reads a definition with (Decisions 17 and 18).
 *
 * A package never imports `better-auth`: its `init` returns the options of a generic OAuth
 * provider (Better Auth's `GenericOAuthConfig` without the `providerId`, which is the definition's
 * `id`), and the engine hands them to Better Auth.
 */

export interface ProviderField {
  type: 'string' | 'url' | 'secret' | 'boolean' | 'select';
  label: string;
  required?: boolean;
  default?: string | boolean;
  /** The values of a `'select'` field. */
  options?: string[];
  /** For `'secret'` and `'string'`, for example a private key. */
  multiline?: boolean;
  hint?: string;
}

export interface ProviderClaim {
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'string[]';
  label: string;
  /** A path into the provider's profile, dots between the steps. It defaults to the claim's key. */
  path?: string;
}

export type ProviderInitOptions = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
} & Record<string, string | boolean | string[]>;

export interface ProviderDefinition {
  id: string;
  name: string;
  kind: 'social' | 'oauth';
  /** Asked for besides the client id, the secret and the scopes. */
  fields?: Record<string, ProviderField>;
  /** Suggestions for profile mapping. */
  claims?: Record<string, ProviderClaim>;
  defaultScopes?: string[];
  /**
   * `'social'`: a Better Auth social provider config.
   * `'oauth'`: a generic OAuth config without `providerId`.
   */
  init(options: ProviderInitOptions): unknown;
}

export type ProviderEntry =
  string | { provider: string; options: Record<string, unknown>; enabled?: boolean };

/**
 * What marks a value as made by `defineProvider`. `Symbol.for`, so it survives two copies of this
 * module (a package is built against its own copy of the plugin).
 */
const BRAND = Symbol.for('strapi.end-users.provider');

const FIELD_TYPES = ['string', 'url', 'secret', 'boolean', 'select'];
const CLAIM_TYPES = ['string', 'number', 'boolean', 'datetime', 'string[]'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Account provider ids Better Auth uses itself: `credential` is the account row of an email and
 * password sign-in, and `siwe` the one of its Sign-In With Ethereum plugin. A provider of this
 * plugin that took one would be linked, unlinked and counted as that sign-in method.
 */
export const RESERVED_PROVIDER_IDS: readonly string[] = ['credential', 'siwe'];

const refuse = (id: unknown, why: string): never => {
  throw new Error(`Invalid provider definition ${JSON.stringify(id)}: ${why}.`);
};

const checkDefinition = (definition: Record<string, unknown>) => {
  const { id, name, fields, claims, defaultScopes, init } = definition;

  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    refuse(id, '`id` must be lowercase letters, numbers and dashes, such as "my-idp"');
  }

  if (RESERVED_PROVIDER_IDS.includes(id as string)) {
    refuse(id, `\`id\` "${id}" is reserved by the sign-in engine, choose another`);
  }

  if (typeof name !== 'string' || name === '') {
    refuse(id, '`name` must be the text the admin shows');
  }

  if (typeof init !== 'function') {
    refuse(id, '`init` must be a function');
  }

  if (
    defaultScopes !== undefined &&
    !(Array.isArray(defaultScopes) && defaultScopes.every((s) => typeof s === 'string'))
  ) {
    refuse(id, '`defaultScopes` must be a list of strings');
  }

  if (fields !== undefined) {
    if (!isRecord(fields)) {
      refuse(id, '`fields` must be an object keyed by option name');
    }

    for (const [key, field] of Object.entries(fields as Record<string, unknown>)) {
      if (['clientId', 'clientSecret', 'scopes'].includes(key)) {
        refuse(id, `\`fields.${key}\` is asked for already, leave it out`);
      }

      if (!isRecord(field) || !FIELD_TYPES.includes(field.type as string)) {
        refuse(id, `\`fields.${key}.type\` must be one of ${FIELD_TYPES.join(', ')}`);
      }

      const typed = field as unknown as ProviderField;

      if (typeof typed.label !== 'string' || typed.label === '') {
        refuse(id, `\`fields.${key}.label\` must be text`);
      }

      if (
        typed.type === 'select' &&
        !(
          Array.isArray(typed.options) &&
          typed.options.length > 0 &&
          typed.options.every((o) => typeof o === 'string')
        )
      ) {
        refuse(id, `\`fields.${key}.options\` must list the values of a select`);
      }
    }
  }

  if (claims !== undefined) {
    if (!isRecord(claims)) {
      refuse(id, '`claims` must be an object keyed by claim');
    }

    for (const [key, claim] of Object.entries(claims as Record<string, unknown>)) {
      if (!isRecord(claim) || !CLAIM_TYPES.includes(claim.type as string)) {
        refuse(id, `\`claims.${key}.type\` must be one of ${CLAIM_TYPES.join(', ')}`);
      }

      if (typeof (claim as unknown as ProviderClaim).label !== 'string') {
        refuse(id, `\`claims.${key}.label\` must be text`);
      }

      const { path } = claim as unknown as ProviderClaim;

      if (path !== undefined && (typeof path !== 'string' || path === '')) {
        refuse(id, `\`claims.${key}.path\` must be a path such as "address.city"`);
      }
    }
  }
};

/** The built-ins use this one; packages use `defineProvider`, which is always `'oauth'`. */
export const createDefinition = (
  kind: ProviderDefinition['kind'],
  definition: Omit<ProviderDefinition, 'kind'>
): ProviderDefinition => {
  checkDefinition(definition as unknown as Record<string, unknown>);

  return Object.defineProperty({ ...definition, kind }, BRAND, { value: true });
};

/**
 * What a provider package's default export is made with. Packages are always `'oauth'`: Better
 * Auth's list of social providers is closed.
 */
export const defineProvider = (definition: Omit<ProviderDefinition, 'kind'>): ProviderDefinition =>
  createDefinition('oauth', definition);

export const isProviderDefinition = (value: unknown): value is ProviderDefinition =>
  isRecord(value) &&
  (value as Record<symbol, unknown>)[BRAND] === true &&
  typeof value.id === 'string' &&
  typeof value.init === 'function';

/** Reads `path` (dots between the steps) out of `profile`; nothing when a step is missing. */
export const readPath = (profile: unknown, path: string): unknown => {
  let current: unknown = profile;

  for (const step of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    // Own properties only: `constructor` or `__proto__` in a claim path reads nothing
    current = Object.hasOwn(current, step) ? (current as Record<string, unknown>)[step] : undefined;
  }

  return current;
};

/** The value of claim `key` in the provider's `profile`, read at its `path` (the key itself by default). */
export const readClaim = (definition: ProviderDefinition, key: string, profile: unknown) => {
  const claim = definition.claims?.[key];

  if (!claim) {
    return undefined;
  }

  return readPath(profile, claim.path ?? key);
};

const isMissing = (value: unknown) => value === undefined || value === null || value === '';

const TYPE_TEXT: Record<ProviderField['type'], string> = {
  string: 'a string',
  secret: 'a string',
  select: 'a string',
  url: 'a URL',
  boolean: 'true or false',
};

const describeType = (field: ProviderField) => TYPE_TEXT[field.type];

/** Why `value` is not a good value for `field`, or nothing when it is. */
const fieldProblem = (field: ProviderField, value: unknown): string | undefined => {
  if (field.type === 'boolean') {
    return typeof value === 'boolean' ? undefined : `must be ${describeType(field)}`;
  }

  if (typeof value !== 'string') {
    return `must be ${describeType(field)}`;
  }

  if (field.type === 'url') {
    try {
      const { protocol } = new URL(value);

      return protocol === 'http:' || protocol === 'https:' ? undefined : 'must be an http(s) URL';
    } catch {
      return 'must be a URL';
    }
  }

  if (field.type === 'select' && !field.options?.includes(value)) {
    return `must be one of ${(field.options ?? []).map((o) => JSON.stringify(o)).join(', ')}`;
  }

  return undefined;
};

/**
 * Checks `options` (as written in `config/plugins.ts`, or saved in the admin) against the
 * definition and returns what `definition.init` takes: the client id, the secret, the scopes
 * (the definition's default ones when none are given) and every declared field, defaults filled
 * in. Options the definition does not declare are left out. Throws `Error` with the problems, a
 * sentence each; `where` starts the message.
 */
export const resolveOptions = (
  definition: ProviderDefinition,
  options: Record<string, unknown>,
  where: string
): ProviderInitOptions => {
  const problems: string[] = [];

  for (const key of ['clientId', 'clientSecret']) {
    if (isMissing(options[key])) {
      problems.push(`\`${key}\` is missing`);
    } else if (typeof options[key] !== 'string') {
      problems.push(`\`${key}\` must be a string`);
    }
  }

  const { scopes } = options;

  if (
    scopes !== undefined &&
    scopes !== null &&
    !(Array.isArray(scopes) && scopes.every((scope) => typeof scope === 'string'))
  ) {
    problems.push('`scopes` must be a list of strings');
  }

  const values: Record<string, string | boolean> = {};

  for (const [key, field] of Object.entries(definition.fields ?? {})) {
    const value = isMissing(options[key]) ? field.default : options[key];

    if (isMissing(value)) {
      if (field.required) {
        problems.push(`\`${key}\` (${field.label}) is required`);
      }
    } else {
      const problem = fieldProblem(field, value);

      if (problem) {
        problems.push(`\`${key}\` (${field.label}) ${problem}, got ${JSON.stringify(value)}`);
      } else {
        values[key] = value as string | boolean;
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`${where}: ${problems.join('; ')}.`);
  }

  return {
    ...values,
    clientId: options.clientId as string,
    clientSecret: options.clientSecret as string,
    scopes: (scopes as string[] | undefined | null) ?? definition.defaultScopes ?? [],
  };
};
