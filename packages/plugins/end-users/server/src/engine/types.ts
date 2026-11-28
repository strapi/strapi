/**
 * The engine boundary.
 *
 * Everything outside `engine/better-auth/` talks to the authentication engine through `AuthEngine`;
 * nothing else imports `better-auth`. These types are therefore engine-neutral: no Better Auth
 * imports, and nothing here names a Better Auth concept that another engine could not provide.
 *
 * Swapping engines means re-implementing `AuthEngine` and the schema mapping.
 */

import type { StartupInputs } from './startup-inputs';

/** Every id that crosses the boundary is a Strapi `documentId`. */
export type ID = string;

/* ---------------------------------------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------------------------------------- */

/** A field's value type. An array of strings is an enumeration of those values. */
export type EngineFieldType =
  'string' | 'number' | 'boolean' | 'date' | 'json' | 'string[]' | 'number[]' | readonly string[];

/** A reference to another table's field. A reference to `id` holds the target's `documentId`. */
export interface EngineFieldReference {
  /** Key of the referenced table (an `EngineTable.name`, for example `user`). */
  model: string;
  field: string;
}

/** One column the engine needs. */
export interface EngineField {
  type: EngineFieldType;
  /** Defaults to `true`. */
  required?: boolean;
  /** Single-column unique constraint. */
  unique?: boolean;
  /** Single-column lookup index. */
  index?: boolean;
  /** `false` means the engine never sends the value to a client: the column is stored private. */
  returned?: boolean;
  /** Hint that the value is short and sorted or compared often (for example a name or an email). */
  sortable?: boolean;
  /** For `number`: a 64-bit integer. */
  bigint?: boolean;
  /** Only plain values are used; a function (a computed default) is ignored. */
  defaultValue?: unknown;
  references?: EngineFieldReference;
  /** The attribute name to store the value under, when it differs from the field's key. */
  fieldName?: string;
  /** `false` means a request body never sets the value: only the engine and the plugin write it. */
  input?: boolean;
}

/** An index over one or more fields, named by field key. */
export interface EngineTableIndex {
  fields: readonly string[];
  unique?: boolean;
}

/** One table the engine needs. */
export interface EngineTable {
  /** The engine's stable key for the table, for example `user` or `twoFactor`. */
  name: string;
  /** Keyed by field key. */
  fields: Record<string, EngineField>;
  indexes?: readonly EngineTableIndex[];
  /** The engine does not want this table created. */
  disableMigrations?: boolean;
}

/* ---------------------------------------------------------------------------------------------
 * Sessions and accounts
 * ------------------------------------------------------------------------------------------- */

/** What the engine knows about the request that creates a session. */
export interface RequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  /** The device the session belongs to; a session made with none gets one of its own. */
  deviceId?: string;
  /** The session passed a second factor, which the new session keeps (a rotation). */
  passedSecondFactor?: boolean;
}

export interface EngineSession {
  id: ID;
  userId: ID;
  /**
   * The secret session token, as stored. It is not a credential on its own: a Bearer header takes
   * only the signed form (`IssuedSession`). Callers must never serialize it into a response or a
   * log line.
   */
  token: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** The device the session was made for, or `null` when the session predates the compatibility mode. */
  deviceId: string | null;
  /** Set when an administrator is signed in as this user. */
  impersonatedBy?: ID | null;
  /**
   * Whether the session was made by a second factor: a verified code, a confirmed enrollment, a
   * passkey, or a trusted device. A sign-in by password alone, by a provider, a link or an old
   * token is not.
   */
  passedSecondFactor: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** A session `createSession` just made, for a caller to hand to its client. */
export interface IssuedSession extends EngineSession {
  /**
   * The token as a client holds it: signed with the secret, the form of the session cookie and of
   * the `set-auth-token` header, and the only one a Bearer header is accepted with.
   */
  token: string;
}

/**
 * Where the credentials of a request came from.
 *
 * - `bearer`: an `Authorization: Bearer` header. It decides alone: a session cookie sent with it is
 *   not read, so a bad token is refused whatever cookie rides along.
 * - `cookie`: the session cookie, with no Bearer header. A browser sends it on its own, so a request
 *   that writes needs an origin check (it can be forged from another site).
 */
export type CredentialSource = 'bearer' | 'cookie';

/** What looking up the session behind a request found out. */
export interface SessionLookup {
  /** The session, or `null`: no credentials, or credentials that are not good. */
  session: EngineSession | null;
  /**
   * The request carried session credentials (a session cookie or a Bearer header), good or not.
   * It is what tells a request that is not signed in from one that claims to be and is wrong.
   * Always `source !== null`.
   */
  credentials: boolean;
  /** Where the credentials came from, good or not; `null` when there were none. */
  source: CredentialSource | null;
  /**
   * `Set-Cookie` values for the response:
   * - a session was found and extended: the fresh cookie (a cookie client's lifetime only slides
   *   if it reaches the client)
   * - no session, and the credentials were a session cookie the engine knows to be stale (expired,
   *   revoked): the cookies that clear it, and only those, so the client stops sending it
   * - otherwise none
   */
  setCookies: string[];
}

/** A sign-in method linked to a user: a password (`providerId: 'credential'`) or an OAuth provider. */
export interface EngineAccount {
  id: ID;
  userId: ID;
  providerId: string;
  accountId: string;
  scope?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------------------------------------------------------------------------------------------
 * The engine
 * ------------------------------------------------------------------------------------------- */

export type InstalledMethod =
  'emailPassword' | 'username' | 'twoFactor' | 'magicLink' | 'emailOtp' | 'passkey';

/**
 * The engine's own endpoints a compat route may run (`AuthEngine.callNative`). Named after what they
 * do, not after a path.
 */
export type NativeEndpoint =
  | 'signInEmail'
  | 'signInUsername'
  | 'signUpEmail'
  | 'requestPasswordReset'
  | 'resetPassword'
  | 'changePassword'
  | 'sendVerificationEmail'
  | 'verifyEmail';

/** The user an endpoint answers with: the engine's own shape, `id` is a `documentId`. */
export interface NativeUser {
  id: ID;
  email: string;
  [key: string]: unknown;
}

interface NativeSession {
  /** `null` when the engine did not sign the user in (a sign-up that needs a verified email). */
  token: string | null;
  user: NativeUser;
}

/** What each native endpoint answers with. */
export interface NativeResults {
  signInEmail: NativeSession & { redirect?: boolean; twoFactorRedirect?: boolean };
  signInUsername: NativeSession & { twoFactorRedirect?: boolean };
  signUpEmail: NativeSession;
  requestPasswordReset: { status: boolean; message?: string };
  resetPassword: { status: boolean };
  changePassword: { token: string | null; user: NativeUser };
  sendVerificationEmail: { status: boolean };
  verifyEmail: { status: boolean; user?: NativeUser };
}

export type NativeResult<K extends NativeEndpoint> = NativeResults[K];

export interface AuthEngine {
  /** The tables and fields the engine needs. The plugin turns them into content types. */
  schema(): EngineTable[];

  /** Runs the engine's native and compat endpoints. */
  handle(request: Request): Promise<Response>;

  /**
   * Runs one of the engine's own endpoints for a compat route, with its hooks (lockout, the
   * password policy, the email rules) and without the router's rate limit and origin check: the
   * compat route was already limited, and the caller is the server, not a browser. The answer comes
   * with the response headers the endpoint set (the session cookie, the Bearer token). A refusal is
   * thrown as the engine gave it: an error with `statusCode` and a `body` that carries `code` and
   * `message`.
   */
  callNative<K extends NativeEndpoint>(
    endpoint: K,
    input: { body?: unknown; query?: unknown; headers: Headers }
  ): Promise<{ headers: Headers; response: NativeResult<K> }>;

  /** The session behind a cookie or a Bearer token, or `null`. */
  getSession(headers: Headers): Promise<EngineSession | null>;

  /**
   * `getSession`, and what else the lookup learned: whether credentials were sent at all, and the
   * cookies the engine wants set. For the request pipeline, which must refuse bad credentials
   * rather than treat them as none, and must pass a refreshed cookie on.
   */
  lookupSession(headers: Headers): Promise<SessionLookup>;

  /**
   * Whether a request from `origin` (an `Origin` header value, or a `Referer` URL) may act with the
   * session cookie: it is a trusted origin or the server's own. The same matcher, and the same
   * list, as the engine's own endpoints use, wildcard patterns included. Anything that cannot be
   * read is not trusted.
   */
  isTrustedOrigin(origin: string): Promise<boolean>;

  /** Signs a user in without a credential check (legacy JWT exchange, compat routes). */
  createSession(userId: ID, meta: RequestMeta): Promise<IssuedSession>;

  /** Signs the user out everywhere, or everywhere but the session `except`. */
  revokeSessions(userId: ID, opts?: { except?: ID }): Promise<void>;

  /** Signs out every session of the user that belongs to the device. */
  revokeDevice(userId: ID, deviceId: string): Promise<void>;

  /** Signs one session out. A session that is not the user's is not found. */
  revokeSession(userId: ID, sessionId: ID): Promise<void>;

  /**
   * Takes a session for one use: removes it with a single conditional delete, and answers with it
   * only when that delete removed exactly one row. Of several requests that claim the same session
   * at once, one gets it and the rest get `null`, as they do for a session that is gone or is not
   * the user's.
   */
  claimSession(userId: ID, sessionId: ID): Promise<EngineSession | null>;

  /**
   * Records that the session was just made by the sign-in of `provider`, for one later
   * `claimProviderSession`. The record is a short-lived row in the database, so it holds across
   * server instances.
   */
  markProviderSession(sessionId: ID, provider: string): Promise<void>;

  /**
   * Spends the record `markProviderSession` made: `true` for exactly one caller, once, and only
   * while the record is fresh. `false` for a session that has none, or whose record was spent.
   */
  claimProviderSession(sessionId: ID, provider: string): Promise<boolean>;

  /** For the admin security panel. */
  listSessions(userId: ID): Promise<EngineSession[]>;

  /** The user's linked sign-in methods. */
  listAccounts(userId: ID): Promise<EngineAccount[]>;

  /** Removes a linked sign-in method. Refuses to remove the last one. */
  unlinkAccount(userId: ID, accountId: ID): Promise<void>;

  hashPassword(plain: string): Promise<string>;

  /** Also accepts a bcrypt hash, for migrated users. */
  verifyPassword(hash: string, plain: string): Promise<boolean>;

  /** Creates or updates the user's credential account. */
  setPassword(userId: ID, plain: string): Promise<void>;

  sendPasswordReset(email: string, redirectTo: string): Promise<void>;

  sendVerificationEmail(userId: ID, redirectTo: string): Promise<void>;

  resetTwoFactor(userId: ID): Promise<void>;

  /** Also revokes the user's sessions. */
  ban(userId: ID, reason?: string, expiresAt?: Date): Promise<void>;

  unban(userId: ID): Promise<void>;

  /** Clears the failed sign-in count and the lock a run of them set (the Security panel's Unlock). */
  unlock(userId: ID): Promise<void>;

  /**
   * Rebuilds the engine from `inputs` (the settings Better Auth reads only when it is built) and
   * swaps to the new instance. Requests in flight finish on the old one. When the new instance
   * cannot start, the old one stays and a `ValidationError` carries the reason.
   */
  reload(inputs: StartupInputs): Promise<void>;

  /** The sign-in methods installed in code, read from the plugin list the engine was built with. */
  installedMethods(): InstalledMethod[];
}
