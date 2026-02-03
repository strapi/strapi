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
}

export interface RateLimit {
  enabled?: boolean;
  interval?: number;
  max?: number;
  delayAfter?: number;
  timeWait?: number;
  prefixKey?: number;
  whitelist?: string;
  store?: string;
}

export interface Transfer {
  token?: TransferToken;
}

export interface FirstPublisedAtField {
  enabled: boolean;
}

export interface Flags {
  nps?: boolean;
  promoteEE?: boolean;
}

export interface PreviewHandlerParams {
  documentId: string;
  locale?: string;
  status?: string;
  [key: string]: unknown;
}

export interface PreviewConfig {
  allowedOrigins?: string[];
  handler: (uid: string, params: PreviewHandlerParams) => string | null | undefined;
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

  // optional - server configuration
  host?: string;
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
  firstPublishedAtField?: FirstPublisedAtField;
  flags?: Flags;
  transfer?: Transfer;
}
