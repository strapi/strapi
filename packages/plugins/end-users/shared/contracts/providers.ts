/**
 * The sign-in providers an administrator configures. The routes are under
 * `/end-users/providers`; answers are `{ data }`.
 *
 * A secret never travels to the admin: the client secret and every `secret` field come back as
 * `{ set: boolean }` and are never part of an error.
 */

/** One option a provider asks for besides the client id, the secret and the scopes. */
export interface ProviderField {
  type: 'string' | 'url' | 'secret' | 'boolean' | 'select';
  label: string;
  required?: boolean;
  default?: string | boolean;
  /** The values of a `'select'` field. */
  options?: string[];
  multiline?: boolean;
  hint?: string;
}

export interface ProviderSummary {
  /** A provider's id, which is also the last part of its redirect URI. */
  id: string;
  name: string;
  /** `'social'` for Better Auth's social providers, `'oidc'` for every generic OAuth one. */
  kind: 'social' | 'oidc';
  /** `'config'`: set in `config/plugins.ts`, so it is locked here. */
  source: 'admin' | 'config';
  /** The provider package it came from, or `null` for a built-in or a custom OIDC provider. */
  package: string | null;
  enabled: boolean;
  /**
   * Whether something was ever set up for it: an entry the admin saved (enabled or not), one set in
   * `config/plugins.ts`, or a custom OIDC provider. `false` for an available provider never saved.
   */
  configured: boolean;
  /** `'needs-secret'`: a stored secret no longer decrypts (the encryption key changed). */
  status: 'ready' | 'needs-secret' | 'disabled';
  /** Computed from the server's public URL, read-only: this is what the identity provider is given. */
  redirectUri: string;
}

/** When a claim is written to the profile: once, when the user is made, or at every sign-in. */
export type ProfileMappingWhen = 'sign-up' | 'every-sign-in';

/**
 * One claim of the provider written to one attribute of the user's profile. `claim` is one of the
 * definition's suggested claims (its key) or a path into the provider's profile, dots between the
 * steps (`address.city`). `attribute` is a plain, writable, non-private attribute of the profile,
 * of a type the claim fits.
 */
export interface ProfileMappingRow {
  attribute: string;
  claim: string;
  when: ProfileMappingWhen;
}

/** A claim a provider can supply, as a suggestion for a mapping row. */
export interface ProviderClaim {
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'string[]';
  label: string;
  path?: string;
}

export interface ProviderDetail extends ProviderSummary {
  clientId: string;
  clientSecretSet: boolean;
  scopes: string[];
  trustForLinking: boolean;
  /**
   * 'Update user details on each sign-in': the name and image the provider sends replace the
   * user's on every sign-in, not only at sign-up. Off by default. The email never changes this way.
   */
  updateUserOnSignIn: boolean;
  /** The claims written to the profile, empty when none. */
  profileMapping: ProfileMappingRow[];
  /** For a custom OIDC provider. */
  discoveryUrl?: string;
  /** The value of each field of the definition; a secret field is only `{ set }`. */
  fields: Record<string, string | boolean | { set: boolean } | null>;
  definition: { fields: Record<string, ProviderField>; claims?: Record<string, ProviderClaim> };
}

/**
 * What `PUT /end-users/providers/:id` takes. Whatever is left out stays as it is; a secret left
 * out (or sent as `{ set: true }`, as it came back) is kept.
 */
export interface ProviderUpdateBody {
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string | { set: boolean };
  scopes?: string[];
  trustForLinking?: boolean;
  updateUserOnSignIn?: boolean;
  /** Replaces the whole list. */
  profileMapping?: ProfileMappingRow[];
  fields?: Record<string, string | boolean | { set: boolean } | null>;
  /** A custom OIDC provider only. */
  name?: string;
  discoveryUrl?: string;
}

/** What `POST /end-users/providers` takes: a custom OpenID Connect provider. */
export interface ProviderCreateBody extends ProviderUpdateBody {
  /** Lowercase letters, numbers and dashes. Taken from `name` when left out. */
  id?: string;
  name: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface ProvidersResponse {
  data: ProviderSummary[];
}

export interface ProviderResponse {
  data: ProviderDetail;
}
