export interface ApiTokenProp {
  salt: string;
}

export interface AuthProp {
  secret: string;
}

export interface TransferTokenProp {
  salt: string;
}

export interface AuditLogsProp {
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

export interface Admin {
  // required
  apiToken: ApiTokenProp;
  transfer: TransferProp;
  auth: AuthProp;

  // optional
  auditLogs?: AuditLogsProp;
  url?: string;
  forgotPassword?: ForgotPasswordProp;
  rateLimit?: RateLimitProp;
}
