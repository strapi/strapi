export interface ApiTokenProp {
  salt: string;
}

export interface AuthSessionsProp {
  options?: {
    algorithm?: string;
    [key: string]: any;
  };
  accessTokenLifespan?: number;
  maxRefreshTokenLifespan?: number;
  idleRefreshTokenLifespan?: number;
  maxSessionLifespan?: number;
  idleSessionLifespan?: number;
}

export interface AuthCookieProp {
  secure?: boolean;
  domain?: string;
  path?: string;
  sameSite?: 'strict' | 'lax' | 'none';
}

export interface AuthEventsProp {
  onConnectionSuccess?: (user: any, provider: string) => void | Promise<void>;
  onConnectionError?: (error: Error, provider: string) => void | Promise<void>;
}

export interface AuthProviderProp {
  [key: string]: any;
}

export interface AuthProp {
  secret: string;
  domain?: string;
  cookie?: AuthCookieProp;
  sessions?: AuthSessionsProp;
  events?: AuthEventsProp;
  providers?: AuthProviderProp[];
  options?: {
    expiresIn?: string | number;
    [key: string]: any;
  };
}

export interface TransferTokenProp {
  salt: string;
}

export interface SecretsProp {
  encryptionKey: string;
}

export interface AuditLogsProp {
  enabled?: boolean;
  retentionDays?: number;
}

export interface HistoryProp {
  retentionDays?: number;
}

export interface ForgotPasswordProp {
  emailTemplate?: string;
  from?: string;
  replyTo?: string;
}

export interface RateLimitProp {
  enabled?: boolean;
  interval?: number;
  max?: number;
  delayAfter?: number;
  timeWait?: number;
  prefixKey?: number;
  whitelist?: string;
  store?: string;
}

export interface TransferProp {
  token: TransferTokenProp;
}

export interface FirstPublisedAtFieldProp {
  enabled: boolean;
}

export interface FlagsProp {
  nps?: boolean | undefined;
  promoteEE?: boolean | undefined;
}

export interface PreviewHandlerParams {
  documentId: string;
  locale?: string;
  status?: string;
  [key: string]: any;
}

export interface PreviewConfigProp {
  allowedOrigins?: string[];
  handler: (uid: string, params: PreviewHandlerParams) => string | null | undefined;
}

export interface PreviewProp {
  enabled: boolean;
  config: PreviewConfigProp;
}

export interface AiProp {
  enabled?: boolean;
}

export interface Admin {
  // required
  apiToken: ApiTokenProp;
  transfer: TransferProp;
  auth: AuthProp;

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
  secrets?: SecretsProp;
  auditLogs?: AuditLogsProp;
  history?: HistoryProp;
  preview?: PreviewProp;
  ai?: AiProp;
  forgotPassword?: ForgotPasswordProp;
  rateLimit?: RateLimitProp;
  firstPublishedAtField?: FirstPublisedAtFieldProp;
  flags?: FlagsProp;
}
