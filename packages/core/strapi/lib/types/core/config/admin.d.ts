export type ApiTokenProp = {
  salt: string;
};

export type AuthProp = {
  secret: string;
};

export type TransferTokenProp = {
  salt: string;
};

export type AuditLogsProp = {
  retentionDays?: number;
};

export type ForgotPasswordProp = {
  emailTemplate?: string;
  from?: string;
  replyTo?: string;
};

export type RateLimitProp = {
  enabled?: boolean;
  interval?: number;
  max?: number;
  delayAfter?: number;
  timeWait?: number;
  prefixKey?: number;
  whietlist?: string;
  store?: string;
};

export type TransferProp = {
  token: TransferTokenProp;
};

export type Admin = {
  // required
  apiToken: ApiTokenProp;
  transfer: TransferProp;
  auth: AuthProp;
  // optional
  auditLogs?: AuditLogsProp;
  url?: string;
  forgotPassword?: ForgotPasswordProp;
  rateLimit?: RateLimitProp;
};
