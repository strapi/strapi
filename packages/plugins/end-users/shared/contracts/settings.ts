/** The sign-in methods an administrator can turn on or off */
export type SignInMethod =
  'emailPassword' | 'username' | 'twoFactor' | 'magicLink' | 'emailOtp' | 'passkey';

/**
 * The settings an administrator changes while the application runs, kept in one document. What a
 * developer sets once is in `config/plugins.ts` instead (`ConfigSummary`, read-only).
 */
export interface EndUsersSettings {
  signUp: {
    enabled: boolean;
    /** Role `documentId`s. Empty means Authenticated. */
    defaultRoles: string[];
    requireEmailVerification: boolean;
    registrationFields: string[];
  };
  /** Where the user lands after the link in an email: a trusted origin or a relative path */
  redirects: {
    emailVerified: string | null;
    passwordReset: string | null;
    error: string | null;
  };
  passwords: { minLength: number; maxLength: number; requireMixedClasses: boolean };
  lockout: { enabled: boolean; maxAttempts: number; durationMinutes: number };
  methods: Record<SignInMethod, boolean>;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type EndUsersSettingsPatch = DeepPartial<EndUsersSettings>;

/**
 * `config/plugins.ts`, read-only in the admin. Never carries a secret value: `secret` says only
 * whether one is set, and whether it is under 32 characters.
 */
export interface ConfigSummary {
  secret: { set: boolean; tooShort: boolean };
  trustedOrigins: string[];
  cookies: { crossSite: boolean; domain: string | null };
  session: { expiresIn: string; updateAge: string; cookieCache: string | false };
  /** `window` (seconds) and `max` are Better Auth's defaults, 10 and 100, when not configured */
  rateLimit: { enabled: boolean; window: number; max: number; storage: 'database' | 'memory' };
  compat: { usersPermissions: boolean; legacyJwtUntil: string | null };
  explain: boolean;
  /**
   * Better Auth plugin ids, and the template keys the project sends from code. Providers from
   * config show on the Providers page.
   */
  auth: { plugins: string[]; senders: string[] };
}

export interface SettingsResponse {
  data: EndUsersSettings;
  meta: {
    installedMethods: string[];
    breachedCheckInstalled: boolean;
    config: ConfigSummary;
  };
}
