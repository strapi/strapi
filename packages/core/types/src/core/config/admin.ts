export interface ApiToken {
  salt: string;
}

export interface AuthSessions {
  options?: {
    algorithm?: string;
    [key: string]: unknown;
  };
  accessTokenLifespan?: number | undefined;
  maxRefreshTokenLifespan?: number;
  idleRefreshTokenLifespan?: number;
  maxSessionLifespan?: number;
  idleSessionLifespan?: number;
}

export interface AuthCookie {
  name?: string;
  secure?: boolean;
  domain?: string;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none' | boolean | null;
}

export interface AuthEvents {
  onConnectionSuccess?: (user: unknown, provider: string) => void | Promise<void>;
  onConnectionError?: (error: Error, provider: string) => void | Promise<void>;
}

export interface AuthProvider {
  [key: string]: unknown;
}

export interface Auth {
  secret: string;
  domain?: string;
  cookie?: AuthCookie;
  sessions?: AuthSessions;
  events?: AuthEvents;
  providers?: AuthProvider[];
  options?: {
    expiresIn?: string | number;
    [key: string]: unknown;
  };
  disableLocalLoginForSSO?: boolean;
}

export interface TransferToken {
  salt?: string;
}

export interface Secrets {
  encryptionKey?: string;
}

export interface AuditLogs {
  enabled?: boolean;
  retentionDays?: number;
}

export interface History {
  retentionDays?: number;
}

export interface ForgotPassword {
  emailTemplate?: string;
  from?: string;
  replyTo?: string;
  /**
   * Lifetime of the reset-password token. Accepts a number of seconds or a
   * shorthand string such as `'15m'` / `'1h'`. Defaults to `'1h'`.
   */
  expiresIn?: string | number;
}

export interface RateLimit {
  enabled?: boolean;
  interval?: number;
  max?: number;
  delayAfter?: number;
  timeWait?: number;
  prefixKey?: string;
  whitelist?: string;
  store?: string;
}

export interface Transfer {
  token?: TransferToken;
}

export interface FirstPublisedAtField {
  /**
   * @deprecated Use `features.future.experimental_firstPublishedAt` in `config/features.ts` instead.
   */
  enabled: boolean;
}

export interface AdminLayoutModel {
  actions?: Record<string, string>;
}

export interface AdminLayout {
  [modelName: string]: AdminLayoutModel | undefined;
}

export interface Flags {
  nps?: boolean;
  promoteEE?: boolean;
  docLinks?: boolean;
}

export interface PreviewHandlerParams {
  documentId: string;
  locale?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PreviewConfig {
  allowedOrigins?: string[];
  handler: (
    uid: string,
    params: PreviewHandlerParams
  ) => string | null | undefined | Promise<string | null | undefined>;
}

export interface Preview {
  enabled: boolean;
  config: PreviewConfig;
}

export interface Ai {
  enabled?: boolean;
}

export interface Admin {
  // required
  apiToken: ApiToken;
  auth: Auth;

  // optional - admin panel URL and legacy dev-server settings
  /**
   * Legacy option from when the admin panel ran on a separate webpack dev server
   * (pre–v5 admin build pipeline). Not read by Strapi v5.
   *
   * For split deployment, use `admin.url` with `server.url` and `serveAdminPanel: false`.
   * For the API listen address, use `server.host` / `server.port` in `config/server.ts`.
   */
  host?: string;
  /**
   * Legacy option from when the admin panel ran on a separate webpack dev server
   * (pre–v5 admin build pipeline). Not read by Strapi v5.
   *
   * For split deployment, use `admin.url` with `server.url` and `serveAdminPanel: false`.
   * For the API listen address, use `server.host` / `server.port` in `config/server.ts`.
   */
  port?: number;
  serveAdminPanel?: boolean;
  autoOpen?: boolean;
  watchIgnoreFiles?: string[];
  path?: string;
  absoluteUrl?: string;
  url?: string;

  // optional - features and security
  secrets?: Secrets;
  auditLogs?: AuditLogs;
  history?: History;
  preview?: Preview;
  ai?: Ai;
  forgotPassword?: ForgotPassword;
  rateLimit?: RateLimit;
  /**
   * @deprecated Use `features.future.experimental_firstPublishedAt` in `config/features.ts` instead.
   */
  firstPublishedAtField?: FirstPublisedAtField;
  flags?: Flags;
  transfer?: Transfer;
  /**
   * Override content-manager edit-view actions per model.
   *
   * Keys are content-type model names. Values map action names to `controller.action` handlers.
   */
  layout?: AdminLayout;
}
