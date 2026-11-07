import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import type {
  ConfigSummary,
  EndUsersSettings,
  EndUsersSettingsPatch,
  SignInMethod,
} from '../../../shared/contracts/settings';
import { readCompatConfig } from '../compat/config';
import { MIN_SECRET_LENGTH, PLUGIN_ID, ROLE_UID } from '../constants';
import {
  loadProjectAuth,
  rateLimitStorage,
  SUPPORTED_SENDERS,
} from '../engine/better-auth/create-engine';
import type { AuthEngine } from '../engine/types';
import { writableProfileAttributes } from '../utils/writable-profile-attributes';
import { PERMISSIONS_TTL_MS } from './ability';

/** Where the document is kept: the core store, as `plugin_end-users_settings`. */
const SETTINGS_KEY = 'settings';

/** Where the registration fields were kept before there was one document: moved on first read. */
const LEGACY_REGISTRATION_FIELDS_KEY = 'registrationFields';

const CONFIG = `plugin::${PLUGIN_ID}`;

/** Better Auth's own rate limit when the configuration leaves it out */
const DEFAULT_RATE_LIMIT = { window: 10, max: 100 };

const METHODS: SignInMethod[] = [
  'emailPassword',
  'username',
  'twoFactor',
  'magicLink',
  'emailOtp',
  'passkey',
];

const defaults = (): EndUsersSettings => ({
  signUp: {
    enabled: true,
    defaultRoles: [],
    requireEmailVerification: false,
    registrationFields: [],
  },
  redirects: { emailVerified: null, passwordReset: null, error: null },
  passwords: { minLength: 8, maxLength: 128, requireMixedClasses: false },
  lockout: { enabled: true, maxAttempts: 5, durationMinutes: 15 },
  methods: {
    emailPassword: true,
    username: true,
    twoFactor: true,
    magicLink: true,
    emailOtp: true,
    passkey: true,
  },
});

type Plain = Record<string, unknown>;

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/** What a value of the setting must be: the default's type, and for a redirect `string | null` */
const fits = (fallback: unknown, value: unknown): boolean => {
  if (Array.isArray(fallback)) {
    return isStringList(value);
  }

  if (fallback === null) {
    return value === null || typeof value === 'string';
  }

  return typeof value === typeof fallback;
};

const invalid = (path: string[], message: string): never => {
  throw new errors.ValidationError(message, {
    errors: [{ path, message, name: 'ValidationError' }],
  });
};

/** Only the origin of this stands in for "this server" when a path is resolved against it */
const PLACEHOLDER_BASE = 'https://placeholder.invalid';

/**
 * A relative path of this server. Browsers strip tabs and newlines from a URL and read a backslash
 * as a slash, so a value with a control character, whitespace or a backslash is never one
 * (`/\t/evil.com` is `//evil.com` to a browser). What is left must still resolve to this server.
 */
const isRelativePath = (value: string) => {
  // eslint-disable-next-line no-control-regex
  if (!value.startsWith('/') || /[\u0000-\u0020\u007f-\u009f\\]/.test(value)) {
    return false;
  }

  try {
    return new URL(value, PLACEHOLDER_BASE).origin === PLACEHOLDER_BASE;
  } catch {
    return false;
  }
};

/**
 * The stored document over the defaults, group by group and key by key: a key the document lacks,
 * or holds with the wrong type, takes the default. Keys the settings don't have are dropped.
 */
const withDefaults = (stored: unknown): EndUsersSettings => {
  const result = defaults() as unknown as Record<string, Plain>;
  const document = isPlain(stored) ? stored : {};

  for (const [group, values] of Object.entries(result)) {
    const found = document[group];

    if (!isPlain(found)) {
      continue;
    }

    for (const key of Object.keys(values)) {
      if (fits(values[key], found[key])) {
        values[key] = found[key];
      }
    }
  }

  return result as unknown as EndUsersSettings;
};

const names = (message: string) => invalid(['signUp', 'registrationFields'], message);

/**
 * `strapi.plugin('end-users').service('settings')`: the settings an administrator changes while the
 * application runs, as opposed to the plugin configuration a developer sets in
 * code, which `configSummary` describes read-only.
 *
 * They are one document in Strapi's core store, which is the database, so a change in production
 * needs no deploy and survives a restart. `get` keeps it in memory the way `ability` keeps the
 * permissions of a role: for `PERMISSIONS_TTL_MS`, cleared at once by `set` on this instance.
 * `set` does not reload the engine: `service('engine').ensureCurrent()` picks up a changed start-up
 * setting on the next authentication request.
 */
const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const engine = () => strapi.plugin(PLUGIN_ID).service('engine').get() as AuthEngine;

  let cached: { settings: EndUsersSettings; expiresAt: number } | undefined;

  /** Bumped by every `set`: a read under way when one happens must not be put in the cache. */
  let generation = 0;

  /**
   * Writes run one at a time: `set` reads the stored document, changes it and writes it back, so two
   * that overlapped would start from the same document and the later write would drop the earlier
   * change. (The queue the provider service keeps for its own writes.)
   */
  let queue: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(run: () => Promise<T>): Promise<T> => {
    const next = queue.then(run, run);

    queue = next.catch(() => undefined);

    return next;
  };

  /**
   * The profile fields a sign-up may write at all: plain values (no relations, media,
   * components or dynamic zones, which would let a sign-up attach the profile to other entries),
   * writable, not private (the Content API refuses those as input too), and never `user`, nor one of
   * the attributes Strapi adds to every content type (`publishedAt`, and `firstPublishedAt` where
   * it is on): they are Strapi's to set, not a field of the profile. Fields a project adds to the
   * profile later show up here by themselves.
   */
  const signUpFields = (): string[] => writableProfileAttributes(strapi);

  /**
   * The document as stored. Until there is one, the list the previous version kept on its own
   * (`registrationFields`) is moved into it and that key deleted, unless a `set` got there first.
   */
  const read = async (): Promise<EndUsersSettings> => {
    const startedAt = generation;
    const stored: unknown = await store().get({ key: SETTINGS_KEY });

    if (isPlain(stored)) {
      return withDefaults(stored);
    }

    const legacy: unknown = await store().get({ key: LEGACY_REGISTRATION_FIELDS_KEY });

    if (legacy === null || legacy === undefined) {
      return withDefaults(null);
    }

    const settings = withDefaults({
      signUp: { registrationFields: isStringList(legacy) ? legacy : [] },
    });

    if (startedAt === generation) {
      await store().set({ key: SETTINGS_KEY, value: settings });
      await store().delete({ key: LEGACY_REGISTRATION_FIELDS_KEY });
    }

    return settings;
  };

  const rolesOf = async (documentIds: string[]) =>
    (await strapi.db.query(ROLE_UID).findMany({
      where: { documentId: { $in: documentIds } },
      select: ['documentId', 'type'],
    })) as Array<{ documentId: string; type: string }>;

  const assertRedirect = async (key: string, url: unknown) => {
    if (url === null) {
      return;
    }

    if (typeof url !== 'string' || url === '') {
      invalid(['redirects', key], `redirects.${key} is a URL or a path, or null`);
    }

    if (!isRelativePath(url as string) && !(await engine().isTrustedOrigin(url as string))) {
      invalid(
        ['redirects', key],
        `redirects.${key} must be a relative path or an address on a trusted origin`
      );
    }
  };

  /** Checks a patch against the settings it is applied to, and applies it */
  const apply = async (current: EndUsersSettings, patch: unknown): Promise<EndUsersSettings> => {
    if (!isPlain(patch)) {
      return invalid([], 'The settings to change are an object');
    }

    const next = structuredClone(current) as unknown as Record<string, Plain>;

    for (const [group, values] of Object.entries(patch)) {
      if (!Object.hasOwn(next, group) || !isPlain(next[group])) {
        invalid([group], `${group} is not a setting`);
      }

      if (!isPlain(values)) {
        invalid([group], `${group} is an object`);
      }

      for (const [key, value] of Object.entries(values as Plain)) {
        if (!Object.hasOwn(next[group], key)) {
          invalid([group, key], `${group}.${key} is not a setting`);
        }

        if (!fits(next[group][key], value)) {
          invalid([group, key], `${group}.${key} has the wrong type`);
        }

        next[group][key] = value;
      }
    }

    const settings = next as unknown as EndUsersSettings;
    const given = patch as Record<string, Plain | undefined>;

    if (given.signUp?.registrationFields !== undefined) {
      const list = [...new Set(settings.signUp.registrationFields.map((name) => name.trim()))];
      const writable = new Set(signUpFields());
      const refused = list.filter((name) => name !== '' && !writable.has(name));

      if (refused.length > 0) {
        names(
          `${refused.join(', ')} ${refused.length === 1 ? 'is not a' : 'are not'} profile field${
            refused.length === 1 ? '' : 's'
          } a sign-up can write`
        );
      }

      settings.signUp.registrationFields = list.filter(Boolean);
    }

    if (given.signUp?.defaultRoles !== undefined) {
      const ids = [...new Set(settings.signUp.defaultRoles)];
      const found = new Map((await rolesOf(ids)).map((role) => [role.documentId, role.type]));
      const missing = ids.filter((id) => !found.has(id));

      if (missing.length > 0) {
        invalid(['signUp', 'defaultRoles'], `No role has the documentId ${missing.join(', ')}`);
      }

      if (ids.some((id) => found.get(id) === 'public')) {
        invalid(['signUp', 'defaultRoles'], 'The Public role cannot be a default role');
      }

      settings.signUp.defaultRoles = ids;
    }

    for (const key of Object.keys(given.redirects ?? {})) {
      await assertRedirect(key, (settings.redirects as unknown as Plain)[key]);
    }

    const { passwords, lockout } = settings;

    if (given.passwords !== undefined) {
      const { minLength, maxLength } = passwords;

      if (!Number.isInteger(minLength) || minLength < 8) {
        invalid(['passwords', 'minLength'], 'passwords.minLength is a whole number, 8 or more');
      }

      if (!Number.isInteger(maxLength) || maxLength > 256) {
        invalid(['passwords', 'maxLength'], 'passwords.maxLength is a whole number, 256 or less');
      }

      if (minLength > maxLength) {
        invalid(['passwords', 'minLength'], 'passwords.minLength cannot be more than maxLength');
      }
    }

    if (given.lockout?.maxAttempts !== undefined) {
      if (
        !Number.isInteger(lockout.maxAttempts) ||
        lockout.maxAttempts < 1 ||
        lockout.maxAttempts > 100
      ) {
        invalid(['lockout', 'maxAttempts'], 'lockout.maxAttempts is a whole number from 1 to 100');
      }
    }

    if (given.lockout?.durationMinutes !== undefined) {
      if (
        !Number.isInteger(lockout.durationMinutes) ||
        lockout.durationMinutes < 1 ||
        lockout.durationMinutes > 1440
      ) {
        invalid(
          ['lockout', 'durationMinutes'],
          'lockout.durationMinutes is a whole number from 1 to 1440'
        );
      }
    }

    const installed = new Set<string>(engine().installedMethods());

    for (const method of METHODS) {
      if (given.methods?.[method] === true && !installed.has(method)) {
        invalid(
          ['methods', method],
          `methods.${method} cannot be on: it is not installed in config/plugins.ts`
        );
      }
    }

    return settings;
  };

  /** The sender functions a project sets in `config/plugins.ts`, as the template each one sends */
  const sendersOf = (project: ReturnType<typeof loadProjectAuth>): string[] => {
    const options = (isPlain(project?.options) ? project?.options : {}) as Plain;
    const plugins = (Array.isArray(options.plugins) ? options.plugins : []) as Array<
      Plain | undefined
    >;
    const pluginOptions = (id: string) => {
      const plugin = plugins.find((candidate) => candidate?.id === id);

      return isPlain(plugin?.options) ? plugin?.options : undefined;
    };
    const isSet = (value: unknown) => typeof value === 'function';
    const at = (path: readonly string[]) =>
      path.reduce<unknown>((value, key) => (isPlain(value) ? value[key] : undefined), options);
    const otp = pluginOptions('two-factor')?.otpOptions;

    const senders: Array<[string, unknown]> = [
      ...SUPPORTED_SENDERS.map(({ path, template }): [string, unknown] => [template, at(path)]),
      ['magic-link', pluginOptions('magic-link')?.sendMagicLink],
      ['email-otp', pluginOptions('email-otp')?.sendVerificationOTP],
      ['two-factor-otp', isPlain(otp) ? otp.sendOTP : undefined],
    ];

    return [...new Set(senders.filter(([, sender]) => isSet(sender)).map(([key]) => key))];
  };

  const duration = (value: unknown, fallback: string) =>
    typeof value === 'number' || typeof value === 'string' ? String(value) : fallback;

  return {
    /** The profile fields a sign-up could be allowed to write. */
    signUpFields,

    /**
     * The settings, with the defaults for what was never set. Kept for `PERMISSIONS_TTL_MS`, and
     * read again at once after `set`; a copy, so a caller never changes what is kept.
     */
    async get(): Promise<EndUsersSettings> {
      if (cached && cached.expiresAt > Date.now()) {
        return structuredClone(cached.settings);
      }

      const startedAt = generation;
      const settings = await read();

      if (startedAt === generation) {
        cached = { settings, expiresAt: Date.now() + PERMISSIONS_TTL_MS };
      }

      return structuredClone(settings);
    },

    /**
     * Changes the settings the patch names, checks the result, stores it and forgets what was
     * kept. Answers the settings as stored. Nothing is stored when a check fails: a
     * `ValidationError` naming the setting. Writes on one server run one at a time. Does not
     * reload the engine (see above).
     */
    set(patch: EndUsersSettingsPatch): Promise<EndUsersSettings> {
      return exclusive(async () => {
        // The base is the stored document, never the cache: another server may have saved since
        const settings = await apply(await read(), patch);

        await store().set({ key: SETTINGS_KEY, value: settings });

        generation += 1;
        cached = undefined;

        return structuredClone(settings);
      });
    },

    /**
     * The plugin configuration an administrator may see, never a secret: `secret` is whether one
     * is set, and whether it is under 32 characters.
     */
    configSummary(): ConfigSummary {
      const config = (key: string) => strapi.config.get<unknown>(`${CONFIG}.${key}`);
      const secret = config('secret');
      const secretSet = typeof secret === 'string' && secret !== '';
      const cookieCache = config('session.cookieCache');
      const domain = config('cookies.domain');
      const until = config('compat.legacyJwt.until');
      const compat = readCompatConfig(strapi);
      const window = config('rateLimit.window');
      const max = config('rateLimit.max');
      const storage = rateLimitStorage(strapi);
      const project = loadProjectAuth(strapi);
      const plugins = isPlain(project?.options) ? project?.options.plugins : undefined;

      return {
        secret: {
          set: secretSet,
          tooShort: secretSet && (secret as string).length < MIN_SECRET_LENGTH,
        },
        trustedOrigins: isStringList(config('trustedOrigins'))
          ? (config('trustedOrigins') as string[])
          : [],
        cookies: {
          crossSite: config('cookies.crossSite') === true,
          domain: typeof domain === 'string' && domain !== '' ? domain : null,
        },
        session: {
          expiresIn: duration(config('session.expiresIn'), '7d'),
          updateAge: duration(config('session.updateAge'), '1d'),
          cookieCache:
            cookieCache === undefined || cookieCache === false || cookieCache === null
              ? false
              : duration(cookieCache, ''),
        },
        rateLimit: {
          enabled: config('rateLimit.enabled') !== false,
          window: typeof window === 'number' ? window : DEFAULT_RATE_LIMIT.window,
          max: typeof max === 'number' ? max : DEFAULT_RATE_LIMIT.max,
          storage,
        },
        compat: {
          usersPermissions: compat.usersPermissions,
          legacyJwtUntil: typeof until === 'string' && until !== '' ? until : null,
          refresh: {
            enabled: compat.refresh.enabled,
            httpOnly: compat.refresh.httpOnly,
            cookieName: compat.refresh.cookie.name,
          },
          connectProviders: Object.keys(compat.connect.callbacks),
          legacyJwtHits: null,
        },
        explain: config('explain') === true,
        auth: {
          plugins: (Array.isArray(plugins) ? plugins : [])
            .map((plugin: unknown) => (isPlain(plugin) ? plugin.id : undefined))
            .filter((id): id is string => typeof id === 'string'),
          senders: sendersOf(project),
        },
      };
    },

    /**
     * What a sign-up may write now: the registration fields that are still profile fields a
     * sign-up can write. A field an administrator listed and a project later removed from the
     * profile (or made private) is not allowed, whatever the list says.
     */
    async getSignUpFields(): Promise<string[]> {
      const writable = new Set(signUpFields());

      return (await this.get()).signUp.registrationFields.filter((name) => writable.has(name));
    },
  };
};

export default settingsService;
