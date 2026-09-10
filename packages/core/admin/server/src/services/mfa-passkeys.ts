import { isIP } from 'node:net';
import { errors } from '@strapi/utils';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransport,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Core, Data } from '@strapi/types';
import type { Passkey } from '../../../shared/contracts/mfa';
import type { PasskeySettings } from '../../../shared/contracts/security-settings';
import type { MfaConfig } from '../config/mfa';
import type { MfaEventMetadata, MfaEventType } from './mfa';
import { warnOnce } from './security-settings';

const { ApplicationError, RateLimitError, ValidationError } = errors;

const USER_UID = 'admin::user';
const CHALLENGE_UID = 'admin::mfa-challenge';

/** The one symbol of this module's five originally-exported constants/types that a test actually
 * needs (`services/__tests__/mfa.test.ts` imports it rather than re-declaring the literal). The
 * other four stay unexported: nothing outside this module reaches them. */
export const PASSKEY_UID = 'admin::mfa-passkey';

/**
 * Matching cycle 3's per-user cap for symmetry -- but this cycle *refuses* the eleventh
 * registration instead of evicting the oldest. Deleting somebody's security key because they
 * registered an eleventh is destroying a credential they may be holding in their hand, and they
 * have a delete button.
 */
export const MAX_PASSKEYS_PER_USER = 10;

/** How long a pending *registration* ceremony stays valid, in seconds. */
const PASSKEY_CEREMONY_TTL_SECONDS = 300;

/**
 * `credentialId` is a `string`, i.e. varchar(255), so the unique index stays portable across
 * every dialect. WebAuthn permits credential ids up to 1023 bytes; no authenticator in practice
 * produces one longer than this (255 base64url characters is 191 raw bytes).
 */
export const MAX_CREDENTIAL_ID_LENGTH = 255;

const RP_NAME = 'Strapi';

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
 * A deliberate approximation of the public suffix list, not the list itself: shipping (or
 * fetching) the real PSL for one validation check is not a trade this cycle makes. A dotless
 * rpId other than `localhost` is refused outright (which covers `com`, `io`, `dev`), and the set
 * below names the second-level suffixes an operator is realistically likely to type.
 *
 * The approximation errs in ONE direction on purpose. A suffix missing from the set is not caught
 * here, and the ceremony then fails in the browser with its own `SecurityError` -- the behaviour
 * that existed before this check, so a miss costs nothing new. Refusing a host that is NOT a
 * public suffix would be the expensive mistake, because it locks a legitimate deployment out of
 * the feature with no way to override. An earlier revision of this check refused on shape (a
 * two-label host with a generic first label and a two-character second label) and did exactly
 * that to real registrable domains such as `co.io` and `org.io`; the shape rule is gone.
 */
const KNOWN_PUBLIC_SUFFIXES = new Set([
  // The widely used ICANN second-level suffixes. This is an APPROXIMATION of the Public Suffix
  // List, not the list itself: shipping or fetching the real PSL for one check is not worth it.
  // The trade-off is deliberate and one-directional -- a suffix missing from this set is simply
  // not caught here, and the browser refuses the ceremony with its own `SecurityError` exactly as
  // it did before this check existed. An earlier revision instead refused on SHAPE (any two-label
  // host whose first label was generic and whose second was two characters), which over-refused
  // real registrable domains such as `co.io` and `org.io` and would have locked those deployments
  // out of the feature entirely. Under-refusing degrades; over-refusing blocks.
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'me.uk',
  'net.uk',
  'sch.uk',
  'co.jp',
  'ne.jp',
  'or.jp',
  'ac.jp',
  'go.jp',
  'co.kr',
  'or.kr',
  'ne.kr',
  'go.kr',
  'co.nz',
  'net.nz',
  'org.nz',
  'ac.nz',
  'govt.nz',
  'co.za',
  'org.za',
  'net.za',
  'ac.za',
  'gov.za',
  'co.in',
  'net.in',
  'org.in',
  'gov.in',
  'ac.in',
  'com.au',
  'net.au',
  'org.au',
  'edu.au',
  'gov.au',
  'com.br',
  'net.br',
  'org.br',
  'gov.br',
  'edu.br',
  'com.mx',
  'org.mx',
  'gob.mx',
  'com.cn',
  'net.cn',
  'org.cn',
  'gov.cn',
  'edu.cn',
  'ac.cn',
  'com.tr',
  'net.tr',
  'org.tr',
  'gov.tr',
  'edu.tr',
  'co.il',
  'org.il',
  'net.il',
  'ac.il',
  'gov.il',
  'com.sg',
  'edu.sg',
  'gov.sg',
  'net.sg',
  'org.sg',
  'com.hk',
  'edu.hk',
  'gov.hk',
  'net.hk',
  'org.hk',
  'com.tw',
  'net.tw',
  'org.tw',
  'gov.tw',
  'edu.tw',
  'com.ar',
  'net.ar',
  'org.ar',
  'gov.ar',
  'edu.ar',
  'com.pl',
  'net.pl',
  'org.pl',
  'gov.pl',
  'edu.pl',
  'com.my',
  'net.my',
  'org.my',
  'gov.my',
  'edu.my',
  'com.vn',
  'net.vn',
  'org.vn',
  'gov.vn',
  'edu.vn',
  'com.ua',
  'net.ua',
  'org.ua',
  'gov.ua',
  'co.id',
  'or.id',
  'ac.id',
  'go.id',
  'net.id',
  'web.id',
  'co.th',
  'ac.th',
  'go.th',
  'or.th',
  'net.th',
  'com.ph',
  'net.ph',
  'org.ph',
  'gov.ph',
  'com.pk',
  'com.bd',
  'com.sa',
  'com.eg',
  'com.ng',
  'com.pe',
  'com.ec',
  'com.uy',
  'com.ve',
  'com.do',
  'com.gt',
  'com.py',
  'com.bo',
  'co.ke',
  'co.tz',
  'co.ug',
  'co.zw',
  'co.bw',
]);

/** An IPv6 host arrives from `URL.hostname` bracketed; `isIP` needs it bare. */
const stripBrackets = (host: string): string => host.replace(/^\[/, '').replace(/\]$/, '');

/**
 * Lowercased, with every trailing DNS root dot stripped. Both matter: a configured rpId must
 * compare equal to an origin's already-lowercase `URL.hostname`, and a host ending in one or more
 * dots is not one a browser accepts as a relying-party id. The normalised value is what gets
 * RETURNED, not merely what gets checked.
 */
const normalizeHost = (host: string): string => host.toLowerCase().replace(/\.+$/, '');

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
  // `[admin.auth.mfa]`, not the shared helper's `[security-settings]` default: this is a config
  // fault, not a database-backed security-settings one, and an operator grepping for the passkey
  // problem greps for the config key, not the store.
  const refuse = (cause: string): never => {
    warnOnce(strapi, 'webauthn.rp', cause, 'error', '[admin.auth.mfa]');
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
    rpId = normalizeHost(configuredRpId);
  } else if (derived) {
    rpId = normalizeHost(stripBrackets(derived.hostname));
  } else {
    rpId = '';
  }

  if (!rpId) {
    return refuse(
      `admin.absoluteUrl (${JSON.stringify(adminUrl ?? null)}) is not a URL a relying-party id can be derived from. Set admin.auth.mfa.webauthn.rpId.`
    );
  }

  if (rpId.startsWith('.')) {
    return refuse(
      `rpId "${rpId}" starts with "." which is not a valid host. Set admin.auth.mfa.webauthn.rpId.`
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

  if (configuredOrigins !== undefined && !Array.isArray(configuredOrigins)) {
    return refuse(
      `admin.auth.mfa.webauthn.origins (${JSON.stringify(configuredOrigins)}) must be an array of origin strings, not a ${typeof configuredOrigins}. Set admin.auth.mfa.webauthn.origins.`
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

export interface PasskeyRow {
  id: Data.ID;
  userId: string;
  credentialId: string;
  /** Base64URL of the COSE key. */
  publicKey: string;
  /** `biginteger` reads back from the database as a string, so every use passes `Number(...)`. */
  counter: string | number;
  transports?: string | null;
  name: string;
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
}

/** The three notices this module raises; a subset of the service's `MfaChangeNotice`. */
type PasskeyNotice = 'passkey_registered' | 'passkey_removed' | 'passkey_used';

export interface PasskeyDeps {
  strapi: Core.Strapi;
  /** The live policy. Injected so this module never reads the store itself. */
  settings: () => Promise<PasskeySettings>;
  config: () => MfaConfig;
  recordEvent: (userId: string, type: MfaEventType, metadata?: MfaEventMetadata) => Promise<void>;
  notify: (
    userId: string,
    // `challenge_failed` as well as the three passkey notices: Task 6's verify path charges
    // cycle 1's account tier, and that notice is how `isAccountThrottled` sees it.
    type: PasskeyNotice | 'challenge_failed',
    extra?: { byUserId?: string; count?: number }
  ) => Promise<void>;
  isAccountThrottled: (userId: string) => Promise<boolean>;
}

// `new Date(undefined).toISOString()` throws a `RangeError`. `createdAt` comes from the default
// timestamps so it is always present in practice -- unlike `lastUsedAt`, which is guarded by its
// caller below because it is genuinely nullable -- but a hand-edited row (or a migration that
// never backfilled it) must not turn a list read into a 500. Falling back to the epoch reads as
// "unknown", which is honest, rather than crashing the route.
const toIso = (value: Date | string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
};

/** The only shape a passkey ever leaves the server in. */
const toPublicPasskey = (row: PasskeyRow): Passkey => ({
  id: String(row.id),
  name: row.name,
  createdAt: toIso(row.createdAt),
  lastUsedAt: row.lastUsedAt ? toIso(row.lastUsedAt) : null,
});

const splitTransports = (value?: string | null): AuthenticatorTransport[] | undefined => {
  const parts = (value ?? '').split(',').filter(Boolean);
  return parts.length > 0 ? (parts as AuthenticatorTransport[]) : undefined;
};

/**
 * The challenge the browser actually signed, read out of `clientDataJSON`, so the consume below
 * can be conditional on *the submitted ceremony* rather than on "any pending ceremony". Anything
 * malformed returns null and becomes the generic registration failure, never a throw.
 */
const readCeremonyChallenge = (registration: RegistrationResponseJSON): string | null => {
  const clientDataJSON = registration?.response?.clientDataJSON;
  if (typeof clientDataJSON !== 'string' || clientDataJSON.length === 0) {
    return null;
  }
  try {
    const decoded = Buffer.from(isoBase64URL.toBuffer(clientDataJSON)).toString('utf8');
    const parsed = JSON.parse(decoded) as { challenge?: unknown };
    return typeof parsed.challenge === 'string' && parsed.challenge.length > 0
      ? parsed.challenge
      : null;
  } catch {
    return null;
  }
};

/**
 * Cycle 4: passkeys. Both ceremonies, plus list / count / delete / clear. Composed into
 * `createMfaService`, so callers reach it as `getService('mfa').registerPasskey` and friends.
 * Every function that decides anything keys on `userId`, and the credential lookup on the login
 * path is scoped to the challenge's owner in the `where` itself -- a global lookup followed by an
 * owner comparison is the same thing until somebody edits it.
 */
export const createPasskeys = ({
  strapi,
  settings,
  config,
  recordEvent,
  notify,
  isAccountThrottled,
}: PasskeyDeps) => {
  const query = () => strapi.db.query(PASSKEY_UID);
  const userQuery = () => strapi.db.query(USER_UID);

  /** The true row count, policy or no policy: the cap must not depend on the setting. */
  const countRows = (userId: string): Promise<number> =>
    query().count({ where: { userId: String(userId) } });

  /**
   * Physical column names for the raw statement that consumes a pending registration ceremony,
   * resolved from metadata for exactly the reasons `consumeTotpStep` gives: the raw connection
   * speaks columns, not attributes, and a schema or migration problem must surface as an
   * actionable error rather than as a `TypeError` or -- far worse -- as an UPDATE that silently
   * affects nothing and therefore reads as "already consumed". Resolves both pending-ceremony
   * columns: M7's fix nulls `mfaPasskeyChallengeExpiresAt` in the same conditional statement as
   * `mfaPasskeyChallenge`, mirroring the mirror `disable` already keeps between the two.
   */
  const userChallengeTable = (): {
    tableName: string;
    challengeColumn: string;
    challengeExpiresAtColumn: string;
  } => {
    const metadata = strapi.db.metadata.get(USER_UID);
    // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
    // attributes and mfaPasskeyChallenge's static type is the full Attribute union. Optional
    // chaining also guards a missing attribute (a migration that has not run), which would
    // otherwise throw before the actionable ApplicationError below can be raised.
    const challengeColumn: string | undefined = metadata.attributes.mfaPasskeyChallenge?.columnName;
    const expiresAttr = metadata.attributes.mfaPasskeyChallengeExpiresAt;
    // @ts-expect-error - same reasoning, for the sibling expiry stamp M7 now also nulls.
    const challengeExpiresAtColumn: string | undefined = expiresAttr?.columnName;

    if (!challengeColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::user.mfaPasskeyChallenge'
      );
    }
    if (!challengeExpiresAtColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::user.mfaPasskeyChallengeExpiresAt'
      );
    }

    return { tableName: metadata.tableName, challengeColumn, challengeExpiresAtColumn };
  };

  const challengeQuery = () => strapi.db.query(CHALLENGE_UID);

  /**
   * Physical names for the three raw statements on the login path: the conditional attempt
   * increment, the challenge write, and the single-DELETE consume. Resolved from metadata for the
   * same reasons as `challengeTable()` in `mfa.ts` -- and resolved *here* rather than injected,
   * so this module stays self-contained the way cycle 3's does.
   */
  const challengeTable = (): {
    tableName: string;
    attemptsColumn: string;
    webauthnColumn: string;
  } => {
    const metadata = strapi.db.metadata.get(CHALLENGE_UID);
    // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
    // attributes and attempts' static type is the full Attribute union. Optional chaining guards
    // a missing attribute so the actionable ApplicationError below is what surfaces.
    const attemptsColumn: string | undefined = metadata.attributes.attempts?.columnName;
    // @ts-expect-error - same reasoning for the cycle 4 column.
    const webauthnColumn: string | undefined = metadata.attributes.webauthnChallenge?.columnName;

    if (!attemptsColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::mfa-challenge.attempts'
      );
    }
    if (!webauthnColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::mfa-challenge.webauthnChallenge'
      );
    }

    return { tableName: metadata.tableName, attemptsColumn, webauthnColumn };
  };

  /**
   * The challenge row, or null when it cannot authorise anything. Mirrors `verifyChallenge`'s own
   * opening checks, including the fail-closed expiry: `new Date('nonsense') <= new Date()` is
   * false for an Invalid Date, so comparing without the NaN guard would turn a missing or
   * malformed `expiresAt` into a challenge that never expires.
   */
  const usableChallenge = async (
    challengeToken: string
  ): Promise<{ id: unknown; userId: string; webauthnChallenge?: string | null } | null> => {
    const challenge = await challengeQuery().findOne({ where: { token: challengeToken } });
    if (!challenge || challenge.consumedAt) {
      return null;
    }

    const expiresAt = new Date(challenge.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return null;
    }

    return challenge;
  };

  const authenticationOptions = async (
    challengeToken: string
  ): Promise<PublicKeyCredentialRequestOptionsJSON> => {
    const challenge = await usableChallenge(challengeToken);
    if (!challenge) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }
    const userId = String(challenge.userId);

    // Checked but not charged: this handler evaluates no factor, so it costs no attempt -- and
    // checking the throttle and the challenge's usability is what stops it being an unmetered
    // oracle.
    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    // Checked before the row read, matching `verifyAssertion`'s own ordering: the two halves of
    // this pair should agree, and the policy check is the cheaper one, so a deployment with
    // passkeys switched off performs no credential query at all.
    if (!(await settings()).enabled) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    const rows = (await query().findMany({
      where: { userId },
      select: ['credentialId', 'transports'],
    })) as Array<Pick<PasskeyRow, 'credentialId' | 'transports'>>;

    // A stored `credentialId` that is not valid base64url makes the real
    // `generateAuthenticationOptions` throw a bare `Error` -- not a `ValidationError` -- which
    // would surface as a 500 on this unauthenticated route, echo the stored id back to a caller
    // who holds only a challenge token, and permanently brick passkey login for that user (one
    // corrupt row blocks every other, good, credential too). Skip it instead and log it at error
    // level so the corrupt row gets noticed, exactly as `excludeCredentials` does on the
    // registration path (below). Filtering before the `length === 0` check is what makes an
    // all-corrupt set fail closed with the generic message rather than with the library's throw.
    const usable = rows.filter((row) => {
      if (isoBase64URL.isBase64URL(row.credentialId)) {
        return true;
      }
      strapi.log.error(
        `Passkey row for admin user ${userId} has a credentialId that is not valid base64url and was skipped when building allowCredentials: ${row.credentialId}`
      );
      return false;
    });

    // The client gates on `passkeyAvailable` and should not have called; either way this is the
    // same generic message as every other failure of this pair.
    if (usable.length === 0) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    // On these two unauthenticated routes an RP refusal returns the generic message and writes
    // the actionable detail to the log (`resolveWebauthnRp` already did): the config key is
    // deployment information and the caller holds only a challenge token.
    let rp: WebauthnRp;
    try {
      rp = resolveWebauthnRp(strapi);
    } catch {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    const options = await generateAuthenticationOptions({
      rpID: rp.rpId,
      allowCredentials: usable.map((row) => ({
        id: row.credentialId,
        transports: splitTransports(row.transports),
      })),
      userVerification: 'preferred',
    });

    // Keyed on the row id alone, overwriting any previous value so a retry re-mints cleanly. No
    // `consumedAt IS NULL` guard: `consumeChallenge` spends a challenge by *deleting* the row, so
    // a consumed challenge is a missing row and the id match is the whole check -- a `consumedAt`
    // predicate here would read as protection it is not providing. The affected-row count is
    // still checked below: a challenge consumed concurrently between `usableChallenge`'s read and
    // this write must not be silently written to.
    const { tableName, webauthnColumn } = challengeTable();
    const written = await strapi.db
      .connection(tableName)
      .where({ id: challenge.id })
      .update({ [webauthnColumn]: options.challenge });

    if (written !== 1) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    return options;
  };

  const verifyAssertion = async (
    challengeToken: string,
    assertion: AuthenticationResponseJSON
  ): Promise<{ userId: string }> => {
    const challenge = await usableChallenge(challengeToken);
    if (!challenge) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }
    const userId = String(challenge.userId);

    if (await isAccountThrottled(userId)) {
      throw new RateLimitError();
    }

    // Defence in depth, not a hole being closed: the cascade runs inside `updateSettings`'s own
    // transaction, so the setting and the rows cannot diverge through it, and the tolerant read
    // falls back to `enabled: true`, so it cannot manufacture this state either. What this does
    // cover is a hand-edited `core_store` row and any future caller that clears the setting
    // without the cascade -- the same class of reason cycle 1 gives for its fail-closed expiry
    // checks. No attempt charged and no event: nothing was evaluated.
    if (!(await settings()).enabled) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    const { tableName, attemptsColumn } = challengeTable();

    // The same conditional increment `verifyChallenge` uses -- `UPDATE ... SET attempts =
    // attempts + 1 WHERE id = ? AND attempts < ?` -- whose affected-row count is the decision,
    // run *before* any verification so a request that crashes mid-verification has still cost an
    // attempt. Both tiers are charged on this path: charging one but not the other is a hole in
    // the other, and a passkey path that charged neither would be the way around cycle 1's
    // throttle entirely.
    const accepted = await strapi.db
      .connection(tableName)
      .where({ id: challenge.id })
      .where(attemptsColumn, '<', config().maxChallengeAttempts)
      .increment(attemptsColumn, 1);

    if (accepted !== 1) {
      // The cap was already reached. Destroy the challenge rather than leave a dead row, exactly
      // as `verifyChallenge` does for `exhausted`.
      await challengeQuery().deleteMany({ where: { id: challenge.id } });
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    /** One spent attempt at the account tier too, then the one generic message. */
    const fail = async (): Promise<never> => {
      await recordEvent(userId, 'challenge_failed');
      notify(userId, 'challenge_failed');
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    };

    // The client called verify without calling options.
    if (!challenge.webauthnChallenge) {
      return fail();
    }

    const credentialId = typeof assertion?.id === 'string' ? assertion.id : '';
    if (!credentialId) {
      return fail();
    }

    // Scoped to the challenge's owner in the `where` itself, never a global lookup followed by an
    // owner comparison: that is the same thing until somebody edits it, and scoping the query
    // means a valid assertion from another account's passkey finds no row.
    const row = (await query().findOne({
      where: { userId, credentialId },
    })) as PasskeyRow | null;
    if (!row) {
      return fail();
    }

    // Resolved here rather than earlier so a misconfiguration cannot be told apart from a bad
    // credential. A refusal charges no event -- it is a deployment fault, not a verification
    // outcome -- and its cause is already in the log at error level.
    let rp: WebauthnRp;
    try {
      rp = resolveWebauthnRp(strapi);
    } catch {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: challenge.webauthnChallenge,
        expectedOrigin: rp.origins,
        expectedRPID: rp.rpId,
        requireUserVerification: false,
        credential: {
          id: row.credentialId,
          publicKey: isoBase64URL.toBuffer(row.publicKey),
          // `biginteger` reads back from the database as a string; the library wants a number.
          counter: Number(row.counter),
          transports: splitTransports(row.transports),
        },
      });
    } catch (error) {
      // The library raises on a counter regression, which is the clone signal, and skips that
      // check when both counters are 0 (most platform passkeys report 0 forever). A raise is
      // treated as a failure like any other.
      strapi.log.warn(
        `A passkey assertion could not be verified for admin user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return fail();
    }

    if (!verification.verified) {
      return fail();
    }

    // The same single DELETE `consumeChallenge` uses: whoever removes the row wins, so a token
    // cannot authorise two operations even if two concurrent requests each present a genuine
    // assertion. Run *before* the row update and the notice below, so only the racer that wins
    // the consume touches the stored counter, and only the winner emits the security notice -- a
    // loser must not announce success for an operation it was refused.
    const consumed = await strapi.db.connection(tableName).where({ id: challenge.id }).del();
    if (consumed !== 1) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    // Scoped by `userId` as well as `id`, not id alone, for the exact reason `deletePasskey`
    // states below: the row was already read scoped to the challenge's owner, but a read and a
    // write are two separate statements, and only carrying the scope on the read is the hazard
    // this module's own factory doc-comment names. This write matters more than that one -- it
    // advances the clone-detection counter -- so the rule has to be uniform, not just followed
    // where it was first noticed.
    await query().update({
      where: { id: row.id, userId },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Hub only, no row -- exactly like cycle 3's `trusted_device_used`.
    notify(userId, 'passkey_used');

    return { userId };
  };

  const passkeyRegistrationOptions = async (
    userId: string
  ): Promise<PublicKeyCredentialCreationOptionsJSON> => {
    const user = await userQuery().findOne({ where: { id: userId } });
    if (!user) {
      throw new ValidationError('User not found');
    }

    // The cheap half of the cap: the browser is never prompted for a ceremony that cannot be
    // stored. The authoritative half is inside `registerPasskey`'s transaction.
    if ((await countRows(userId)) >= MAX_PASSKEYS_PER_USER) {
      throw new ValidationError(PASSKEY_CAP_MESSAGE);
    }

    const { rpId } = resolveWebauthnRp(strapi);

    const existing = (await query().findMany({
      where: { userId: String(userId) },
      select: ['credentialId', 'transports'],
    })) as Array<Pick<PasskeyRow, 'credentialId' | 'transports'>>;

    // A stored `credentialId` that is not valid base64url makes the real `generateRegistrationOptions`
    // throw a bare `Error` -- not a `ValidationError` -- which would surface as a 500 and
    // permanently brick this route for the user: they could never register a replacement while
    // the malformed row exists. Skip it instead and log it at error level so the corrupt row gets
    // noticed; the only cost is losing the browser's `InvalidStateError` de-dupe nicety for that
    // one authenticator, which is far cheaper than locking the user out of the feature entirely.
    const excludeCredentials = existing
      .filter((row) => {
        if (isoBase64URL.isBase64URL(row.credentialId)) {
          return true;
        }
        strapi.log.error(
          `Passkey row for admin user ${userId} has a credentialId that is not valid base64url and was skipped when building excludeCredentials: ${row.credentialId}`
        );
        return false;
      })
      .map((row) => ({
        id: row.credentialId,
        transports: splitTransports(row.transports),
      }));

    const displayName =
      [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.email;

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: rpId,
      // The library throws on a string, and if `userID` is omitted it generates random bytes --
      // which would be unrecoverable, because the user handle is what a discoverable credential
      // returns at login. Deriving it from the admin user id means a later passwordless cycle can
      // decode a returned `userHandle` straight back to the id with no stored column, which is
      // the whole justification for requesting `residentKey: 'preferred'` in this cycle.
      userID: isoUint8Array.fromUTF8String(String(user.id)),
      userName: user.email,
      userDisplayName: displayName,
      // No AAGUID allow-list, no attestation policy: under `none` the client sends sixteen zero
      // bytes, so a column for it would hold zeros.
      attestationType: 'none',
      // What makes a second registration of the same authenticator fail in the browser with
      // `InvalidStateError` instead of creating a duplicate row.
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        // A hardware key with no PIN still works as a second factor: the password already
        // established who the user is.
        userVerification: 'preferred',
      },
    });

    // One pending registration per user; a new options call overwrites it, exactly as cycle 1's
    // `mfaPendingSecret` carries a pending enrolment.
    await userQuery().update({
      where: { id: userId },
      data: {
        mfaPasskeyChallenge: options.challenge,
        mfaPasskeyChallengeExpiresAt: new Date(Date.now() + PASSKEY_CEREMONY_TTL_SECONDS * 1000),
      },
    });

    return options;
  };

  const registerPasskey = async (
    userId: string,
    name: string,
    registration: RegistrationResponseJSON
  ): Promise<Passkey> => {
    const user = await userQuery().findOne({ where: { id: userId } });

    // Defence in depth, not the primary guard: the conditional statement below binds `submitted`
    // (the challenge the browser actually signed), never the just-read `user.mfaPasskeyChallenge`,
    // so a `null` column can never satisfy it and this check is provably redundant for that
    // binding. It stays because the binding is what does the real work -- if a later edit rebinds
    // the `where` to the read value instead of `submitted`, a `null` column becomes `IS NULL` and
    // this guard becomes the only thing standing between that mistake and a replay.
    if (!user?.mfaPasskeyChallenge) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const submitted = readCeremonyChallenge(registration);
    if (!submitted) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    // One conditional statement whose affected-row count is the decision, the idiom
    // `consumeTotpStep` uses: the ceremony is spent here, before anything is verified, so two
    // submissions of the same ceremony cannot both land. The submitted challenge is bound as a
    // non-null string, so a response signed over a different challenge matches nothing and leaves
    // the genuine ceremony pending.
    const { tableName, challengeColumn, challengeExpiresAtColumn } = userChallengeTable();
    // M7: nulls `mfaPasskeyChallengeExpiresAt` in the same statement, alongside the challenge
    // itself -- the stamp used to survive a successful registration and only `disable` ever
    // cleared it, which is the mirror `disable`'s own comment already claims is kept.
    const affected = await strapi.db
      .connection(tableName)
      .where({ id: userId })
      .where({ [challengeColumn]: submitted })
      .update({ [challengeColumn]: null, [challengeExpiresAtColumn]: null });

    if (affected !== 1) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    // Expiry fails closed (cycle 1's rule): `new Date('nonsense') <= new Date()` is false for an
    // Invalid Date, so a missing or hand-edited stamp must not read as a ceremony that never
    // expires. The stamp itself decides nothing else -- the guard above is on the challenge
    // column alone -- and the next options call overwrites it. Read here before the row this
    // registration lands in is even created, and cleared above regardless of what it reads.
    const expiresAt = new Date(user.mfaPasskeyChallengeExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const { rpId, origins } = resolveWebauthnRp(strapi);

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registration,
        // `submitted` is the value the consume above actually matched on, not the pre-consume read
        // -- they are provably equal on every reachable path, but this removes the divergence by
        // construction instead of relying on that proof.
        expectedChallenge: submitted,
        expectedOrigin: origins,
        expectedRPID: rpId,
        // `requireUserVerification` defaults to **true** in both of the library's verifiers, so
        // passing false is load-bearing, not decorative (spec: "Requiring user verification").
        requireUserVerification: false,
      });
    } catch (error) {
      // No cause in the response: every registration failure after the ceremony starts is one
      // message. The log is where the detail goes.
      strapi.log.warn(
        `A passkey registration could not be verified for admin user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const credential = verification.verified
      ? verification.registrationInfo?.credential
      : undefined;
    if (!credential || credential.id.length > MAX_CREDENTIAL_ID_LENGTH) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const transports = credential.transports ?? registration.response?.transports ?? [];

    let created: PasskeyRow;
    try {
      created = await strapi.db.transaction(async () => {
        const row = (await query().create({
          data: {
            userId: String(userId),
            credentialId: credential.id,
            publicKey: isoBase64URL.fromBuffer(credential.publicKey),
            counter: credential.counter,
            transports: transports.length > 0 ? transports.join(',') : null,
            name,
            lastUsedAt: null,
          },
        })) as PasskeyRow;

        // The authoritative half of the cap: the recount and the insert share this transaction, so
        // a row that commits between `passkeyRegistrationOptions`' pre-check and this recount is
        // caught and the insert rolls back. This is not a concurrency guard -- two genuinely
        // parallel transactions never see each other's uncommitted inserts, so it cannot stop two
        // truly simultaneous registrations from both landing. The concurrency guard is the
        // single-use ceremony consume above: one pending challenge column per user, spent by one
        // conditional statement, so two concurrent registrations for the same user can never both
        // reach this point.
        if ((await countRows(userId)) > MAX_PASSKEYS_PER_USER) {
          throw new ValidationError(PASSKEY_CAP_MESSAGE);
        }

        // Inside the same transaction as the row, exactly as cycle 3 records `device_trusted`:
        // the credential and the audit trail that explains it must land or fail together.
        // `notify` stays outside -- it is the event hub, fire and forget.
        await recordEvent(userId, 'passkey_registered', { deviceName: name });

        return row;
      });
    } catch (error) {
      // The cap refusal is ours and keeps its actionable message. Anything else is a database
      // error -- above all the unique-constraint violation on `credentialId`, which must not
      // propagate as a dialect-specific 500 naming the table.
      if (error instanceof ValidationError) {
        throw error;
      }
      strapi.log.warn(
        `A passkey could not be stored for admin user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    notify(userId, 'passkey_registered');

    return toPublicPasskey(created);
  };

  /**
   * The caller's own rows, newest first. Empty while the policy is off, so this and the
   * administrator count never disagree. One consequence worth stating: in the only state where
   * surviving rows and a disabled policy coexist (a hand-edited `core_store` row), the lists read
   * empty, so the permitted direction is reachable only through the administrator DELETE, which
   * deletes without reading.
   */
  const listPasskeys = async (userId: string): Promise<Passkey[]> => {
    if (!(await settings()).enabled) {
      return [];
    }

    const rows = (await query().findMany({
      where: { userId: String(userId) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })) as PasskeyRow[];

    return rows.map(toPublicPasskey);
  };

  /** Zero while the policy is off, for the same reason. `passkeyAvailable` is `> 0`. */
  const countPasskeys = async (userId: string): Promise<number> => {
    if (!(await settings()).enabled) {
      return 0;
    }
    return countRows(userId);
  };

  /**
   * One row, only if it is the caller's -- scoped in the `where` itself. No policy check:
   * removing a credential is never the dangerous direction, and TOTP always survives it, so there
   * is no lockout path.
   */
  const deletePasskey = async (userId: string, id: string): Promise<boolean> => {
    const row = (await query().findOne({
      where: { id, userId: String(userId) },
    })) as PasskeyRow | null;

    if (!row) {
      return false;
    }

    // Scoped by `userId` as well as `id`, not id alone: the read above is owner-scoped, but a read
    // and a write are two separate statements, and only carrying the scope on the read is the
    // hazard this module's own factory doc-comment names -- correct today only because nothing
    // reorders the two.
    await query().deleteMany({ where: { id: row.id, userId: String(userId) } });
    await recordEvent(userId, 'passkey_removed', { deviceName: row.name });
    notify(userId, 'passkey_removed');

    return true;
  };

  /** Silent: the caller's own event (`disabled`, or the administrator handler) covers it. */
  const clearPasskeys = async (userId: string): Promise<number> => {
    const result = await query().deleteMany({ where: { userId: String(userId) } });
    return result?.count ?? 0;
  };

  /** Silent, every user: the transition to `passkeys.enabled: false`. */
  const clearAllPasskeys = async (): Promise<number> => {
    const result = await query().deleteMany({ where: {} });
    return result?.count ?? 0;
  };

  const passkeySettings = (): Promise<PasskeySettings> => settings();

  /**
   * I1: whether a webauthn ceremony can even be attempted in this deployment, without leaking why
   * not to whichever caller asks -- `resolveWebauthnRp`'s refusal is already logged at error level
   * (through `warnOnce`) where it happens, so this wrapper only ever needs to swallow it into a
   * boolean. Composed with the organisation policy by both `passkeysEnabled` on `/mfa/me`
   * (`controllers/mfa.ts`) and `passkeyAvailable` on the challenge response
   * (`controllers/authentication.ts`), so neither ever advertises a passkey button a
   * misconfigured deployment cannot honour, and neither can 500 on account of asking.
   */
  const passkeysConfigured = (): boolean => {
    try {
      resolveWebauthnRp(strapi);
      return true;
    } catch {
      return false;
    }
  };

  return {
    passkeyRegistrationOptions,
    registerPasskey,
    listPasskeys,
    countPasskeys,
    deletePasskey,
    clearPasskeys,
    clearAllPasskeys,
    authenticationOptions,
    verifyAssertion,
    passkeySettings,
    passkeysConfigured,
  };
};
