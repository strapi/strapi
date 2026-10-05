import type { Core, Data } from '@strapi/types';
import type { Context } from 'koa';

export type CookieSetOptions = NonNullable<Parameters<Context['cookies']['set']>[2]>;

/** Cookie attributes and the optional custom name used for refresh tokens. */
export interface SessionCookieOptions extends CookieSetOptions {
  name?: string;
}

export type PluginContext = { strapi: Core.Strapi };

export type User = {
  id: Data.ID;
  documentId: string;
  username: string;
  email: string;
  provider?: string;
  password?: string;
  resetPasswordToken?: string | null;
  confirmationToken?: string | null;
  confirmed?: boolean;
  blocked?: boolean;
  role?: Role;
};

export type Permission = { id: Data.ID; action: string; role?: Role };
export type Role = {
  id: Data.ID;
  name: string;
  description?: string;
  type: string;
  permissions?: Permission[];
  users?: User[];
  nb_users?: number;
};

export type Action = { enabled: boolean; policy?: string };
export type ActionsMap = Record<string, { controllers: Record<string, Record<string, Action>> }>;
export type RolePermissions = Record<
  string,
  { controllers?: Record<string, Record<string, Action> | null> | null }
>;
export type RoleInput = {
  users?: Data.ID[];
  name: string;
  description?: string;
  type?: string;
  permissions?: RolePermissions | null;
};

export type AdvancedSettings = {
  allow_register: boolean;
  unique_email: boolean;
  default_role: string;
  email_confirmation?: boolean;
  email_confirmation_redirection?: string;
  email_reset_password?: string;
};

export type EmailOptions = {
  from: { name?: string; email?: string };
  response_email?: string;
  object: string;
  message: string;
};
export type EmailSettings = Record<string, { options: EmailOptions }>;

export type SessionsConfig = {
  httpOnly?: boolean;
  accessTokenLifespan?: number;
  maxRefreshTokenLifespan?: number;
  idleRefreshTokenLifespan?: number;
  maxSessionLifespan?: number;
  idleSessionLifespan?: number;
  cookie?: SessionCookieOptions;
};

export type OAuthEndpoints = {
  oauth?: 1 | 2;
  authorize_url?: string;
  access_url?: string;
  request_url?: string;
  scope_delimiter?: string;
  token_endpoint_auth_method?: string;
};
export type ProviderSettings = OAuthEndpoints & {
  enabled?: boolean;
  icon?: string;
  key?: string;
  secret?: string;
  callback?: string;
  callbackUrl?: string;
  redirect_uri?: string;
  scope?: string | string[];
  subdomain?: string;
  jwksurl?: string;
};
export type GrantConfig = Record<string, ProviderSettings>;
export type OAuthProvider = ProviderSettings & {
  name: string;
  authorize_url: string;
  access_url: string;
  redirect_uri: string;
};
export type OAuthQuery = Record<string, string | undefined>;
export type GrantResponse = {
  access_token?: string;
  access_secret?: string;
  oauth_token?: string;
  oauth_token_secret?: string;
  refresh_token?: string;
  id_token?: string;
  raw?: {
    screen_name?: string;
    email?: string;
    user_id?: string | number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type ProviderProfile = { username?: string; email?: string; [key: string]: unknown };
export type ProviderAuthContext = {
  accessToken?: string;
  query?: Record<string, unknown>;
  providers?: GrantConfig;
  grantResponse?: GrantResponse;
};
export type AuthProvider = {
  enabled: boolean;
  icon: string;
  grantConfig: ProviderSettings;
  authCallback?: (context: ProviderAuthContext) => Promise<ProviderProfile>;
};
