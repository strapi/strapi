import { isIP } from 'node:net';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { warnOnce } from './security-settings';

const { ValidationError } = errors;

export const PASSKEY_UID = 'admin::mfa-passkey';

/**
 * Matching cycle 3's per-user cap for symmetry -- but this cycle *refuses* the eleventh
 * registration instead of evicting the oldest. Deleting somebody's security key because they
 * registered an eleventh is destroying a credential they may be holding in their hand, and they
 * have a delete button.
 */
export const MAX_PASSKEYS_PER_USER = 10;

/** How long a pending *registration* ceremony stays valid, in seconds. */
export const PASSKEY_CEREMONY_TTL_SECONDS = 300;

/**
 * `credentialId` is a `string`, i.e. varchar(255), so the unique index stays portable across
 * every dialect. WebAuthn permits credential ids up to 1023 bytes; no authenticator in practice
 * produces one longer than this (255 base64url characters is 191 raw bytes).
 */
export const MAX_CREDENTIAL_ID_LENGTH = 255;

export const RP_NAME = 'Strapi';

/**
 * Every literal cycle 4 introduces, in one place. The first two are *shared*: each covers every
 * failure of its kind, so no caller can tell one cause from another -- cycle 1's reason,
 * unchanged, is that a caller must not be able to distinguish an expired challenge from a wrong
 * credential. The last four are route-specific and deliberately actionable, because each names
 * something the caller can fix about their own request.
 */
export const PASSKEY_VERIFY_FAILED = 'Could not verify that passkey.';
export const PASSKEY_REGISTRATION_FAILED = 'That passkey could not be verified.';
export const PASSKEY_CAP_MESSAGE = `You can register at most ${MAX_PASSKEYS_PER_USER} passkeys.`;
export const PASSKEYS_DISABLED = 'Passkeys are disabled';
export const PASSKEY_NEEDS_TOTP = 'Set up an authenticator app before adding a passkey.';
export const PASSKEY_RP_NOT_CONFIGURED =
  'Passkeys are not configured for this deployment. Set admin.auth.mfa.webauthn.rpId.';

export interface WebauthnRp {
  /** The relying-party id: a registrable domain, or `localhost`. Never an IP literal. */
  rpId: string;
  /** Every origin an assertion may legitimately come from. */
  origins: string[];
}

/**
 * A deliberate approximation of the public suffix list. Browsers reject a relying-party id that
 * is itself a public suffix, and shipping (or fetching) the real PSL for one validation check is
 * not a trade this cycle makes -- so a dotless rpId other than `localhost` is refused outright
 * (which covers `com`, `io`, `dev`) plus the handful of second-level suffixes an operator is
 * actually likely to type. A suffix this misses fails in the browser instead, which is the
 * pre-existing behaviour, not a regression.
 */
const KNOWN_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'co.jp',
  'co.nz',
  'co.za',
  'co.in',
  'com.au',
  'com.br',
  'com.mx',
  'com.cn',
]);

/** `new URL('http://[::1]:1337').hostname` keeps the brackets; `isIP` does not want them. */
const stripBrackets = (host: string): string => host.replace(/^\[/, '').replace(/\]$/, '');

const isPublicSuffix = (rpId: string): boolean => {
  if (rpId === 'localhost') {
    return false;
  }
  if (!rpId.includes('.')) {
    return true;
  }
  return KNOWN_PUBLIC_SUFFIXES.has(rpId);
};

/** WebAuthn needs a secure context: https anywhere, or http on localhost. */
const isSecureOrigin = (url: URL): boolean =>
  url.protocol === 'https:' ||
  (url.protocol === 'http:' && stripBrackets(url.hostname) === 'localhost');

/**
 * The relying-party identity every ceremony runs against: `admin.absoluteUrl`'s hostname and
 * origin (computed at boot by `packages/core/core/src/configuration/index.ts:122`, so the admin
 * server reads it with no import from `@strapi/core`), overridable by
 * `admin.auth.mfa.webauthn.rpId` and `admin.auth.mfa.webauthn.origins`.
 *
 * Deliberately *not* the request's `Origin` header, though that would need no configuration and
 * survive any proxy: the fixed relying-party identity is the check WebAuthn's phishing resistance
 * rests on, and taking it from the request makes it attacker-influenceable, so a credential could
 * end up bound to a hostname the deployment never meant to serve.
 *
 * Derivation is not "works with no configuration at all". `getAbsoluteAdminUrl`
 * (`packages/core/core/src/configuration/urls.ts:70-95`) only rewrites the host to `localhost`
 * when `config.environment === 'development'`; in production, with the default `server.url` of ''
 * and the `HOST=0.0.0.0` every `create-strapi-app` template writes, `admin.absoluteUrl` is
 * `http://0.0.0.0:1337/admin`. So every refusal below names the config key that fixes it, and the
 * cause is logged (once per process, through the one `warnOnce` surface) at error level, because
 * the operator has an action. The thrown message is the same for all of them: on the two
 * unauthenticated login routes the caller holds only a challenge token and deployment
 * information is not theirs to learn.
 */
export const resolveWebauthnRp = (strapi: Core.Strapi): WebauthnRp => {
  const refuse = (cause: string): never => {
    warnOnce(strapi, 'webauthn.rp', `admin.auth.mfa.webauthn: ${cause}`, 'error');
    throw new ValidationError(PASSKEY_RP_NOT_CONFIGURED);
  };

  const configuredRpId = strapi.config.get<string | undefined>('admin.auth.mfa.webauthn.rpId');
  const configuredOrigins = strapi.config.get<string[] | undefined>(
    'admin.auth.mfa.webauthn.origins'
  );
  const adminUrl = strapi.config.get<string | undefined>('admin.absoluteUrl');

  let derived: URL | null = null;
  if (typeof adminUrl === 'string' && adminUrl.length > 0) {
    try {
      derived = new URL(adminUrl);
    } catch {
      derived = null;
    }
  }

  let rpId: string;
  if (typeof configuredRpId === 'string' && configuredRpId.length > 0) {
    rpId = configuredRpId;
  } else if (derived) {
    rpId = stripBrackets(derived.hostname);
  } else {
    rpId = '';
  }

  if (!rpId) {
    return refuse(
      `admin.absoluteUrl (${JSON.stringify(adminUrl ?? null)}) is not a URL a relying-party id can be derived from. Set admin.auth.mfa.webauthn.rpId.`
    );
  }

  if (isIP(stripBrackets(rpId)) !== 0) {
    return refuse(
      `rpId "${rpId}" is an IP literal, which no browser accepts as a relying-party id -- only "localhost" works without a domain. Set admin.auth.mfa.webauthn.rpId.`
    );
  }

  if (isPublicSuffix(rpId)) {
    return refuse(
      `rpId "${rpId}" is a public suffix (or a bare label), which browsers reject. Set admin.auth.mfa.webauthn.rpId to the registrable domain the admin panel is served from.`
    );
  }

  let candidates: string[];
  if (Array.isArray(configuredOrigins) && configuredOrigins.length > 0) {
    candidates = configuredOrigins;
  } else if (derived) {
    candidates = [derived.origin];
  } else {
    candidates = [];
  }

  if (candidates.length === 0) {
    return refuse(
      'no expected origin could be derived from admin.absoluteUrl. Set admin.auth.mfa.webauthn.origins.'
    );
  }

  const origins: string[] = [];
  for (const candidate of candidates) {
    let url: URL;
    try {
      url = new URL(String(candidate));
    } catch {
      return refuse(
        `origin ${JSON.stringify(candidate)} is not a URL. Set admin.auth.mfa.webauthn.origins.`
      );
    }

    if (!isSecureOrigin(url)) {
      return refuse(
        `origin "${url.origin}" is not a secure context: every expected origin must be https:, or http://localhost[:port]. Set admin.auth.mfa.webauthn.origins.`
      );
    }

    // The leading dot is load-bearing: `host.endsWith(rpId)` accepts "evil-example.com" for
    // "example.com". Run for every origin whether or not either key was set -- in the
    // fully-derived case it is trivially satisfied, and the dangerous case is `origins`
    // configured against a derived rpId, where nothing else relates the two.
    const host = stripBrackets(url.hostname);
    if (host !== rpId && !host.endsWith(`.${rpId}`)) {
      return refuse(
        `origin "${url.origin}" is neither the relying party "${rpId}" nor a subdomain of it. Set admin.auth.mfa.webauthn.rpId and admin.auth.mfa.webauthn.origins so they agree.`
      );
    }

    origins.push(url.origin);
  }

  return { rpId, origins };
};
