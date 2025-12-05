export interface ApiToken {
  salt: string;
}

export interface AuthSessions {
  options?:
    | {
        algorithm?: string | undefined;
        [key: string]: unknown;
      }
    | undefined;
  accessTokenLifespan?: number | undefined;
  maxRefreshTokenLifespan?: number | undefined;
  idleRefreshTokenLifespan?: number | undefined;
  maxSessionLifespan?: number | undefined;
  idleSessionLifespan?: number | undefined;
}

export interface AuthCookie {
  secure?: boolean | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  sameSite?: 'strict' | 'lax' | 'none' | boolean | null | undefined;
}

export interface AuthEvents {
  onConnectionSuccess?: (user: unknown, provider: string) => void | Promise<void> | undefined;
  onConnectionError?: (error: Error, provider: string) => void | Promise<void> | undefined;
}

export interface AuthProvider {
  [key: string]: unknown;
}

export interface Auth {
  secret: string;
  domain?: string | undefined;
  cookie?: AuthCookie | undefined;
  sessions?: AuthSessions | undefined;
  events?: AuthEvents | undefined;
  providers?: AuthProvider[] | undefined;
  options?:
    | {
        expiresIn?: string | number | undefined;
        [key: string]: unknown;
      }
    | undefined;
}

export interface TransferToken {
  salt: string;
}

export interface Secrets {
  encryptionKey: string;
}

export interface AuditLogs {
  enabled?: boolean | undefined;
  retentionDays?: number | undefined;
}

export interface History {
  retentionDays?: number | undefined;
}

export interface ForgotPassword {
  emailTemplate?: string | undefined;
  from?: string | undefined;
  replyTo?: string | undefined;
}

export interface RateLimit {
  enabled?: boolean | undefined;
  interval?: number | undefined;
  max?: number | undefined;
  delayAfter?: number | undefined;
  timeWait?: number | undefined;
  prefixKey?: number | undefined;
  whitelist?: string | undefined;
  store?: string | undefined;
}

export interface Transfer {
  token: TransferToken;
}

export interface FirstPublisedAtField {
  enabled: boolean;
}

export interface Flags {
  nps?: boolean | undefined;
  promoteEE?: boolean | undefined;
}

export interface PreviewHandlerParams {
  documentId: string;
  locale?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PreviewConfig {
  allowedOrigins?: string[] | undefined;
  handler: (uid: string, params: PreviewHandlerParams) => string | null | undefined;
}

export interface Preview {
  enabled: boolean;
  config: PreviewConfig;
}

export interface Ai {
  enabled?: boolean | undefined;
}

export interface Admin {
  // required
  apiToken: ApiToken;
  transfer: Transfer;
  auth: Auth;

  // optional - server configuration
  host?: string | undefined;
  port?: number | undefined;
  serveAdminPanel?: boolean | undefined;
  autoOpen?: boolean | undefined;
  watchIgnoreFiles?: string[] | undefined;
  path?: string | undefined;
  absoluteUrl?: string | undefined;
  url?: string | undefined;

  // optional - features and security
  secrets?: Secrets | undefined;
  auditLogs?: AuditLogs | undefined;
  history?: History | undefined;
  preview?: Preview | undefined;
  ai?: Ai | undefined;
  forgotPassword?: ForgotPassword | undefined;
  rateLimit?: RateLimit | undefined;
  firstPublishedAtField?: FirstPublisedAtField | undefined;
  flags?: Flags | undefined;
}
