import type { ProviderUpdateBody } from '../../../shared/contracts/providers';

/** One entry of Users & Permissions' stored `grant`, as the admin form and the seed write it */
export type UpGrant = Record<
  string,
  {
    enabled?: boolean;
    key?: string;
    secret?: string;
    scope?: string[] | string;
    callback?: string;
    callbackUrl?: string;
    subdomain?: string;
    jwksurl?: string;
  }
>;

export type ProviderMapping =
  | { kind: 'email'; enabled: boolean }
  | { kind: 'mapped'; upId: string; body: ProviderUpdateBody; callback: string | null }
  | {
      kind: 'needs-input';
      upId: string;
      body: ProviderUpdateBody;
      missing: string[];
      callback: string | null;
    }
  | { kind: 'not-supported'; upId: string; reason: 'no-equivalent' | 'custom' };

/**
 * Every provider mapped here is one end-users ships, so its `body` is written with the provider
 * service's `update(upId, body)`; `create` takes custom OpenID Connect providers only, and none
 * of these maps to one.
 */
type Entry = UpGrant[string];

/** Providers that map to the built-in or preset of the same id */
const SAME_ID = new Set([
  'discord',
  'facebook',
  'github',
  'google',
  'linkedin',
  'microsoft',
  'reddit',
  'twitch',
  'vk',
  'auth0',
  'keycloak',
  'patreon',
  'cognito',
]);

/** OAuth 1.0a in Users & Permissions: the keys cannot be reused */
const NEEDS_NEW_CREDENTIALS = new Set(['twitter']);

const NO_EQUIVALENT = new Set(['instagram', 'cas']);

const AUTH0_SUFFIX = '.auth0.com';

const toScopes = (scope: Entry['scope']): string[] => {
  let list: unknown[] = [];

  if (Array.isArray(scope)) {
    list = scope;
  } else if (typeof scope === 'string') {
    list = scope.split(',');
  }

  return list.map((item) => String(item).trim()).filter((item) => item.length > 0);
};

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const auth0Domain = (subdomain: string): string =>
  subdomain.endsWith(AUTH0_SUFFIX) ? subdomain : `${subdomain}${AUTH0_SUFFIX}`;

const keycloakIssuer = (subdomain: string): string =>
  /^https?:\/\//i.test(subdomain) ? subdomain : `https://${subdomain}`;

/** `https://cognito-idp.<region>.amazonaws.com/<pool id>/.well-known/jwks.json` */
const cognitoFromJwks = (jwksurl: string): { region: string; userPoolId: string } | null => {
  const match = /^https:\/\/cognito-idp\.([a-z0-9-]+)\.amazonaws\.com\/([^/]+)\//i.exec(jwksurl);

  return match ? { region: match[1], userPoolId: match[2] } : null;
};

/** The definition-specific fields Users & Permissions stored in `subdomain` and `jwksurl` */
const fieldsFor = (upId: string, entry: Entry): Record<string, string> => {
  const subdomain = trimmed(entry.subdomain);
  const jwksurl = trimmed(entry.jwksurl);
  const fields: Record<string, string> = {};

  if (upId === 'auth0' && subdomain) {
    fields.domain = auth0Domain(subdomain);
  }

  if (upId === 'keycloak' && subdomain) {
    fields.issuer = keycloakIssuer(subdomain);
  }

  if (upId === 'cognito') {
    if (subdomain) {
      fields.domain = subdomain;
    }

    Object.assign(fields, cognitoFromJwks(jwksurl) ?? {});
  }

  return fields;
};

/** A provider nobody ever configured: the seed lists them all, disabled and empty */
const isUntouched = (entry: Entry): boolean =>
  !entry.enabled &&
  !trimmed(entry.key) &&
  !trimmed(entry.secret) &&
  !trimmed(entry.subdomain) &&
  !trimmed(entry.jwksurl);

const buildBody = (
  entry: Entry,
  fields: Record<string, string>,
  enabled: boolean,
  withCredentials: boolean
): ProviderUpdateBody => {
  const scopes = toScopes(entry.scope);
  const clientId = withCredentials ? trimmed(entry.key) : '';
  const clientSecret = withCredentials ? trimmed(entry.secret) : '';

  return {
    enabled,
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
    ...(scopes.length > 0 ? { scopes } : {}),
    ...(Object.keys(fields).length > 0 ? { fields } : {}),
  };
};

/**
 * Turns Users & Permissions' stored `grant` into what end-users has for each provider. `required`
 * answers, for a provider id, the fields its definition requires beyond the client id and secret
 * (`null` when the plugin has no definition of that id). Pure: nothing is read or written.
 */
export const mapUpGrant = (
  grant: UpGrant,
  required: (id: string) => string[] | null
): ProviderMapping[] => {
  const mappings: ProviderMapping[] = [];

  for (const [upId, rawEntry] of Object.entries(grant ?? {})) {
    const entry = rawEntry ?? {};

    if (upId === 'email') {
      mappings.push({ kind: 'email', enabled: Boolean(entry.enabled) });
      continue;
    }

    if (isUntouched(entry)) {
      continue;
    }

    const callback = trimmed(entry.callback) || trimmed(entry.callbackUrl) || null;

    if (NO_EQUIVALENT.has(upId)) {
      mappings.push({ kind: 'not-supported', upId, reason: 'no-equivalent' });
      continue;
    }

    if (NEEDS_NEW_CREDENTIALS.has(upId)) {
      mappings.push({
        kind: 'needs-input',
        upId,
        body: buildBody(entry, {}, false, false),
        missing: ['clientId', 'clientSecret'],
        callback,
      });
      continue;
    }

    if (!SAME_ID.has(upId)) {
      mappings.push({ kind: 'not-supported', upId, reason: 'custom' });
      continue;
    }

    const fields = fieldsFor(upId, entry);
    const missing: string[] = [];

    if (!trimmed(entry.key)) {
      missing.push('clientId');
    }

    if (!trimmed(entry.secret)) {
      missing.push('clientSecret');
    }

    for (const name of required(upId) ?? []) {
      if (name !== 'clientId' && name !== 'clientSecret' && !fields[name]) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      mappings.push({
        kind: 'needs-input',
        upId,
        body: buildBody(entry, fields, false, true),
        missing,
        callback,
      });
    } else {
      mappings.push({
        kind: 'mapped',
        upId,
        body: buildBody(entry, fields, entry.enabled ?? false, true),
        callback,
      });
    }
  }

  return mappings;
};
