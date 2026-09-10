import { isIP } from 'node:net';
import { errors } from '@strapi/utils';
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type {
  AuthenticatorTransport,
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Core, Data } from '@strapi/types';
import type { Passkey } from '../../../shared/contracts/mfa';
import type { PasskeySettings } from '../../../shared/contracts/security-settings';
import type { MfaConfig } from '../config/mfa';
import type { MfaEventMetadata, MfaEventType } from './mfa';
import { warnOnce } from './security-settings';

// `RateLimitError` is unused until Task 6 (the login ceremony) throttles a spent challenge token.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { ApplicationError, RateLimitError, ValidationError } = errors;

const USER_UID = 'admin::user';
// `CHALLENGE_UID` is unused until Task 6 resolves `admin::mfa-challenge`'s webauthn-challenge
// column for the login ceremony.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CHALLENGE_UID = 'admin::mfa-challenge';

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

/**
 * Lowercase and strip every trailing DNS root dot before any check runs, so `EXAMPLE.com`,
 * `example.com.`, `example.com..` and `example.com` are all treated as the one host a browser
 * treats them as. A single-dot strip (`replace(/\.$/, '')`) leaves a residual dot on any host with
 * two or more trailing dots (`a.b..` -> `a.b.`, still not a valid host), so this must strip the
 * whole trailing run (`replace(/\.+$/, '')`). Applied once, at the point `rpId` is computed, so
 * every later check (IP-literal, public-suffix, and the origin/rpId relation check) and the
 * returned value all see the same normalised form. A leading dot is not stripped -- it is not a
 * valid host, so it is refused explicitly instead.
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
export type PasskeyNotice = 'passkey_registered' | 'passkey_removed' | 'passkey_used';

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

const toIso = (value: Date | string): string => new Date(value).toISOString();

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
  // Task 6 (the login ceremony) is the consumer of `config` and `isAccountThrottled`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config,
  recordEvent,
  notify,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
   * affects nothing and therefore reads as "already consumed".
   */
  const userChallengeTable = (): { tableName: string; challengeColumn: string } => {
    const metadata = strapi.db.metadata.get(USER_UID);
    // @ts-expect-error - no dynamic typings for the models, columnName only exists on scalar
    // attributes and mfaPasskeyChallenge's static type is the full Attribute union. Optional
    // chaining also guards a missing attribute (a migration that has not run), which would
    // otherwise throw before the actionable ApplicationError below can be raised.
    const challengeColumn: string | undefined = metadata.attributes.mfaPasskeyChallenge?.columnName;

    if (!challengeColumn) {
      throw new ApplicationError(
        'Could not resolve the physical column name for admin::user.mfaPasskeyChallenge'
      );
    }

    return { tableName: metadata.tableName, challengeColumn };
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
    const { tableName, challengeColumn } = userChallengeTable();
    const affected = await strapi.db
      .connection(tableName)
      .where({ id: userId })
      .where({ [challengeColumn]: submitted })
      .update({ [challengeColumn]: null });

    if (affected !== 1) {
      throw new ValidationError(PASSKEY_REGISTRATION_FAILED);
    }

    // Expiry fails closed (cycle 1's rule): `new Date('nonsense') <= new Date()` is false for an
    // Invalid Date, so a missing or hand-edited stamp must not read as a ceremony that never
    // expires. The stamp itself decides nothing else -- the guard above is on the challenge
    // column alone -- and the next options call overwrites it.
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

  return {
    passkeyRegistrationOptions,
    registerPasskey,
    listPasskeys,
    countPasskeys,
    deletePasskey,
    clearPasskeys,
    clearAllPasskeys,
    passkeySettings,
  };
};
