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
import { MAX_PASSKEYS_PER_USER, type Passkey } from '../../../shared/contracts/mfa';
import type { PasskeySettings } from '../../../shared/contracts/security-settings';
import type { MfaConfig } from '../config/mfa';
import type { MfaEventMetadata, MfaEventType } from './mfa';
import { warnOnce } from './security-settings';

const { ApplicationError, RateLimitError, ValidationError } = errors;

const USER_UID = 'admin::user';
const CHALLENGE_UID = 'admin::mfa-challenge';

export const PASSKEY_UID = 'admin::mfa-passkey';

/** Refuses the eleventh rather than evicting the oldest, unlike trusted devices: deleting a
 * security key somebody may be holding in their hand is not ours to do. */
export { MAX_PASSKEYS_PER_USER };

const PASSKEY_CEREMONY_TTL_SECONDS = 300;

/** varchar(255), so the unique index stays portable across dialects. WebAuthn permits up to 1023
 * bytes, but no authenticator in practice produces one longer than this. */
export const MAX_CREDENTIAL_ID_LENGTH = 255;

const RP_NAME = 'Strapi';

/** The first two are shared across every failure of their kind, so a caller cannot distinguish an
 * expired challenge from a wrong credential. The last four name something the caller can fix. */
export const PASSKEY_VERIFY_FAILED = 'Could not verify that passkey.';
export const PASSKEY_REGISTRATION_FAILED = 'That passkey could not be verified.';
export const PASSKEY_CAP_MESSAGE = `You can register at most ${MAX_PASSKEYS_PER_USER} passkeys.`;
export const PASSKEYS_DISABLED = 'Passkeys are disabled';
export const PASSKEY_NEEDS_TOTP = 'Set up an authenticator app before adding a passkey.';
export const PASSKEY_RP_NOT_CONFIGURED =
  'Passkeys are not configured for this deployment. Set admin.auth.mfa.webauthn.rpId.';

export interface WebauthnRp {
  rpId: string;
  origins: string[];
}

/**
 * An approximation of the public suffix list, erring in one direction on purpose: a missing suffix
 * is caught by the browser's own `SecurityError`, while refusing a host that is NOT a public
 * suffix locks a legitimate deployment out with no override. Matching on shape rather than
 * membership is what makes that mistake, to real domains like `co.io`.
 */
const KNOWN_PUBLIC_SUFFIXES = new Set([
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

const stripBrackets = (host: string): string => host.replace(/^\[/, '').replace(/\]$/, '');

/** The normalised value is what is RETURNED, not merely what is checked: a trailing root dot is
 * not a relying-party id any browser accepts. */
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

const isSecureOrigin = (url: URL): boolean =>
  url.protocol === 'https:' ||
  (url.protocol === 'http:' && stripBrackets(url.hostname) === 'localhost');

/**
 * The relying-party identity every ceremony runs against: `admin.absoluteUrl`'s hostname and
 * origin (computed at boot in `packages/core/core/src/configuration`, so the admin
 * server reads it with no import from `@strapi/core`), overridable by
 * `admin.auth.mfa.webauthn.rpId` and `admin.auth.mfa.webauthn.origins`.
 *
 * Deliberately *not* the request's `Origin` header, though that would need no configuration and
 * survive any proxy: the fixed relying-party identity is the check WebAuthn's phishing resistance
 * rests on, and taking it from the request makes it attacker-influenceable, so a credential could
 * end up bound to a hostname the deployment never meant to serve.
 *
 * Derivation is not "works with no configuration at all". `getAbsoluteAdminUrl`
 * (`packages/core/core/src/configuration/urls.ts`) only rewrites the host to `localhost`
 * when `config.environment === 'development'`; in production, with the default `server.url` of ''
 * and the `HOST=0.0.0.0` every `create-strapi-app` template writes, `admin.absoluteUrl` is
 * `http://0.0.0.0:1337/admin`. So every refusal below names the config key that fixes it, and the
 * cause is logged (once per process, through the one `warnOnce` surface) at error level, because
 * the operator has an action. The thrown message is the same for all of them: on the two
 * unauthenticated login routes the caller holds only a challenge token and deployment
 * information is not theirs to learn.
 */
export const resolveWebauthnRp = (strapi: Core.Strapi): WebauthnRp => {
  // `[admin.auth.mfa]`, not the helper's `[security-settings]` default: an operator greps for the
  // config key, not the store.
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
    // "example.com". Run for every origin, since the dangerous case is `origins` configured against a
    // derived rpId, where nothing else relates the two.
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
  publicKey: string;
  /** `biginteger` reads back from the database as a string, so every use passes `Number(...)`. */
  counter: string | number;
  transports?: string | null;
  name: string;
  lastUsedAt?: Date | string | null;
  createdAt: Date | string;
}

type PasskeyNotice = 'passkey_registered' | 'passkey_removed' | 'passkey_used';

export interface PasskeyDeps {
  strapi: Core.Strapi;
  settings: () => Promise<PasskeySettings>;
  config: () => MfaConfig;
  recordEvent: (userId: string, type: MfaEventType, metadata?: MfaEventMetadata) => Promise<void>;
  notify: (
    userId: string,
    // `challenge_failed` too: the verify path charges the same per-account tier the TOTP paths do,
    // and that notice is how `isAccountThrottled` sees it.
    type: PasskeyNotice | 'challenge_failed',
    extra?: { byUserId?: string; count?: number }
  ) => Promise<void>;
  isAccountThrottled: (userId: string) => Promise<boolean>;
}

// `new Date(undefined).toISOString()` throws, so a hand-edited row must not turn a list read into
// a 500. The epoch fallback reads as "unknown".
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

/** Read out of `clientDataJSON`, so the consume below is conditional on *the submitted ceremony*
 * rather than on "any pending ceremony". Malformed input returns null, never throws. */
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

/** Every function that decides anything keys on `userId`, and the login-path credential lookup is
 * owner-scoped in the `where` itself: a global lookup plus an owner comparison is the same thing
 * only until somebody edits it. */
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

  /** A migration problem must surface as an error, not as an UPDATE that affects nothing and so
   * reads as "already consumed". Both pending-ceremony columns are nulled in the same statement. */
  const userChallengeTable = (): {
    tableName: string;
    challengeColumn: string;
    challengeExpiresAtColumn: string;
  } => {
    const metadata = strapi.db.metadata.get(USER_UID);
    // @ts-expect-error - columnName exists only on scalar attributes; the union type does not
    // know that.
    const challengeColumn: string | undefined = metadata.attributes.mfaPasskeyChallenge?.columnName;
    const expiresAttr = metadata.attributes.mfaPasskeyChallengeExpiresAt;
    // @ts-expect-error - same reasoning, for the sibling expiry stamp nulled alongside it.
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

  /** Resolved here rather than injected, so this module needs nothing from its factory but the
   * services it cannot resolve itself. */
  const challengeTable = (): {
    tableName: string;
    attemptsColumn: string;
    webauthnColumn: string;
  } => {
    const metadata = strapi.db.metadata.get(CHALLENGE_UID);
    // @ts-expect-error - columnName exists only on scalar attributes; the union type does not
    // know that.
    const attemptsColumn: string | undefined = metadata.attributes.attempts?.columnName;
    // @ts-expect-error - same reasoning for the passkeys column.
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

  /** Mirrors `verifyChallenge`'s opening checks, including the fail-closed expiry: without the NaN
   * guard a malformed `expiresAt` is a challenge that never expires. */
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

    // One credentialId that is not valid base64url makes `generateAuthenticationOptions` throw a bare
    // `Error`: a 500 on an unauthenticated route that echoes the stored id back and bricks passkey
    // login for that user entirely. Filtering before the `length === 0` check is what makes an
    // all-corrupt set fail closed with the generic message.
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

    // No `consumedAt IS NULL` guard: a spent challenge is a deleted row, so the id match is the whole
    // check. The affected-row count below catches one consumed concurrently since the read.
    const { tableName, webauthnColumn } = challengeTable();
    const written = await strapi.db
      .getConnection(tableName)
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

    // Defence in depth: the cascade already runs inside `updateSettings`' transaction, so this covers
    // a hand-edited `core_store` row or a future caller that clears the setting without it.
    if (!(await settings()).enabled) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    const { tableName, attemptsColumn } = challengeTable();

    // `verifyChallenge`'s conditional increment, run *before* any verification so a request that
    // crashes mid-verification has still cost an attempt. Both tiers are charged on this path:
    // charging one but not the other is a hole in the other, and a passkey path that charged
    // neither would be the way around the throttle entirely.
    const accepted = await strapi.db
      .getConnection(tableName)
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

    // Owner-scoped in the `where` itself, so a valid assertion from another account finds no row.
    const row = (await query().findOne({
      where: { userId, credentialId },
    })) as PasskeyRow | null;
    if (!row) {
      return fail();
    }

    // Resolved here, not earlier, so a misconfiguration cannot be told apart from a bad credential.
    // A refusal charges no event: it is a deployment fault, not a verification outcome.
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
      // The library raises on a counter regression (the clone signal) and skips the check when both
      // counters are 0, which most platform passkeys report forever.
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

    // `consumeChallenge`'s DELETE again, run *before* the row update and the notice, so only the
    // racer that wins the consume touches the counter or announces success.
    const consumed = await strapi.db.getConnection(tableName).where({ id: challenge.id }).del();
    if (consumed !== 1) {
      throw new ValidationError(PASSKEY_VERIFY_FAILED);
    }

    // Scoped by `userId` as well as `id`: an owner check that lives only on the read is one
    // reordering away from being no check at all.
    await query().update({
      where: { id: row.id, userId },
      data: {
        counter: verification.authenticationInfo.newCounter,
        lastUsedAt: new Date(),
      },
    });

    // Hub only, no row -- the same treatment `trusted_device_used` gets: audit-visible, but not
    // worth a persisted event per login.
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

    // One invalid base64url `credentialId` makes `generateRegistrationOptions` throw, bricking this
    // route for the user. Skipping costs only the browser's `InvalidStateError` de-dupe for that
    // authenticator.
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
      // Omitting `userID` makes the library generate random bytes, which is unrecoverable: the user
      // handle is what a discoverable credential returns at login. Deriving it from the id means a
      // later passwordless flow can decode it back with no stored column.
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

    // One pending registration per user; a new options call overwrites it, the way
    // `mfaPendingSecret` carries one pending TOTP enrolment.
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

    // Redundant while the statement below binds `submitted` rather than the read value. It stays
    // because rebinding it to the read value turns a `null` column into `IS NULL`, and this would
    // then be the only thing between that edit and a replay.
    if (!user?.mfaPasskeyChallenge) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const submitted = readCeremonyChallenge(registration);
    if (!submitted) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    // Spent before anything is verified, so two submissions of the same ceremony cannot both land.
    // Bound as a non-null string, so a response signed over a different challenge matches nothing.
    const { tableName, challengeColumn, challengeExpiresAtColumn } = userChallengeTable();
    // Nulls `mfaPasskeyChallengeExpiresAt` in the same statement as the challenge itself, so a
    // spent ceremony never leaves an expiry stamp behind for the next one to trip over.
    const affected = await strapi.db
      .getConnection(tableName)
      .where({ id: userId })
      .where({ [challengeColumn]: submitted })
      .update({ [challengeColumn]: null, [challengeExpiresAtColumn]: null });

    if (affected !== 1) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    // Fails closed: without the NaN guard a hand-edited stamp is a ceremony that never expires.
    const expiresAt = new Date(user.mfaPasskeyChallengeExpiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    const { rpId, origins } = resolveWebauthnRp(strapi);

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: registration,
        // The value the consume matched on, not the pre-consume read: equal on every reachable path, but
        // this removes the divergence by construction.
        expectedChallenge: submitted,
        expectedOrigin: origins,
        expectedRPID: rpId,
        // `requireUserVerification` defaults to **true** in both of the library's verifiers, so
        // passing false is load-bearing, not decorative.
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

        // The authoritative half of the cap: recount and insert share this transaction, so a row that
        // commits since the pre-check rolls the insert back. `>` against the pre-check's `>=`, because
        // this runs *after* the insert. Not a concurrency guard -- that is the ceremony consume above.
        if ((await countRows(userId)) > MAX_PASSKEYS_PER_USER) {
          throw new ValidationError(PASSKEY_CAP_MESSAGE);
        }

        // In the transaction: the credential and the audit trail that explains it land or fail together.
        await recordEvent(userId, 'passkey_registered', { deviceName: name });

        return row;
      });
    } catch (error) {
      // Ours keeps its actionable message; anything else is a database error, above all the
      // unique-constraint violation on `credentialId`, which must not surface as a 500 naming the table.
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

  /** Empty while the policy is off, so this and the administrator count never disagree. */
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

  /** Zero while the policy is off, for the same reason. The login screen's `passkeyAvailable`
   * needs this `> 0` *and* a usable relying party (`passkeyAvailableFor`). */
  const countPasskeys = async (userId: string): Promise<number> => {
    if (!(await settings()).enabled) {
      return 0;
    }
    return countRows(userId);
  };

  /** No policy check: removing a credential is never the dangerous direction, and TOTP survives it. */
  const deletePasskey = async (userId: string, id: string): Promise<boolean> => {
    const row = (await query().findOne({
      where: { id, userId: String(userId) },
    })) as PasskeyRow | null;

    if (!row) {
      return false;
    }

    // Scoped by `userId` too: a check that lives only on the read survives only until a reorder.
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

  /** Whether a ceremony can be attempted at all, without leaking why not: the refusal is already
   * logged where it happens, so this only swallows it into a boolean. Both callers compose it with
   * the organisation policy, so neither advertises a button a misconfigured deployment cannot
   * honour. */
  const passkeysConfigured = (): boolean => {
    try {
      resolveWebauthnRp(strapi);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Boot-time discoverability for the one misconfiguration that hides the whole feature: without
   * this the refusal only reaches the log once somebody loads the admin, long after the operator
   * stopped watching the console. `warnOnce` keys it, so spending the once at boot deliberately
   * silences the later lazy callers. Silent when the organisation has passkeys off.
   */
  const warnIfPasskeysMisconfigured = async (): Promise<void> => {
    if (!(await settings()).enabled) {
      return;
    }

    passkeysConfigured();
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
    warnIfPasskeysMisconfigured,
  };
};
