import { errors, getDeviceName, sanitizeSessionEntry, sortSessionsForDisplay } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PLUGIN_ID, USER_UID } from '../../constants';
import type { AuthEngine, EngineSession } from '../../engine/types';
import type compatService from '../../services/compat';
import type { CompatConfig } from '../config';
import { upError } from '../errors';
import { readLegacyCutover } from '../legacy-jwt';
import { revokeLegacySessions } from '../legacy-sessions';
import { LEGACY_ORIGIN } from '../origin';
import {
  clearRefreshCookie,
  hasRefreshCookie,
  readRefreshToken,
  wantsRefreshCookie,
  writeRefreshCookie,
} from '../refresh-cookie';
import { ok } from './result';
import { engineOf, plain } from './shared';
import type { CompatResult } from '../types';

interface RequestInput {
  body?: unknown;
  headers: Headers | undefined;
}

/** The table behind the session manager, where the old refresh tokens' sessions are kept. */
const LEGACY_SESSION_UID = 'admin::session';

const NOT_FOUND: CompatResult = { status: 404, body: upError('NotFoundError', 'Not Found') };

const MISSING_AUTHENTICATION: CompatResult = {
  status: 401,
  body: upError('UnauthorizedError', 'Missing authentication'),
};

const INVALID_REFRESH_TOKEN: CompatResult = {
  status: 401,
  body: upError('UnauthorizedError', 'Invalid refresh token'),
};

/** A token as the engine reads one from a request: the Bearer header alone, no cookies. */
const asBearer = (token: string): Headers => new Headers({ authorization: `Bearer ${token}` });

const nonEmpty = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** The engine refuses a session it will not make (a banned user) with a Strapi error of its own. */
const refusedSession = (error: unknown): CompatResult | null =>
  error instanceof errors.ForbiddenError
    ? { status: 403, body: upError('ForbiddenError', error.message, error.details) }
    : null;

/** The session behind the request's credentials, or `null`. */
const callerOf = (engine: AuthEngine, headers: Headers | undefined) =>
  engine.getSession(new Headers(headers));

/**
 * Signs `session` out and gives its user a new one on the same device: the rotation. The session
 * is claimed first, with one conditional delete that succeeds for one request only, and the new
 * session is made only after that. The token it replaces stops working at once, so a replay, or a
 * request that lost the race, is a refusal. A session of an impersonation is never rotated.
 */
const rotate = async (
  engine: AuthEngine,
  session: EngineSession,
  headers: Headers | undefined
): Promise<string | null> => {
  if (session.impersonatedBy) {
    return null;
  }

  const claimed = await engine.claimSession(session.userId, session.id);

  if (!claimed) {
    return null;
  }

  const next = await engine.createSession(claimed.userId, {
    ipAddress: claimed.ipAddress,
    userAgent: headers?.get('user-agent') ?? claimed.userAgent,
    ...(claimed.deviceId ? { deviceId: claimed.deviceId } : {}),
  });

  return next.token;
};

/**
 * An old refresh token, from the `users-permissions` origin, exchanged for a session that keeps the
 * old one's device. Accepted on the terms of an old access token: before `legacyJwt.until`, once a
 * completed migration is recorded, and only when it was issued no later than the cutover (the
 * session's own creation time). The old session is claimed first, with one conditional delete that
 * succeeds for one request only, and the new session is made after that, so the token cannot be
 * used twice.
 */
const exchangeLegacy = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  engine: AuthEngine,
  token: string,
  headers: Headers | undefined
): Promise<string | null> => {
  const { until } = cfg.legacyJwt;

  if (!until || until.getTime() <= Date.now() || !strapi.sessionManager.hasOrigin(LEGACY_ORIGIN)) {
    return null;
  }

  const cutover = await readLegacyCutover(strapi);

  if (!cutover) {
    return null;
  }

  const manager = strapi.sessionManager(LEGACY_ORIGIN);
  const validation = await manager.validateRefreshToken(token);

  if (!validation.isValid) {
    return null;
  }

  // The token carries no issue time of its own: the session it names does. That is the active
  // record, made when the token was issued or rotated.
  const old = (await manager.listSessions(validation.userId)).find(
    ({ sessionId }) => sessionId === validation.sessionId
  );

  if (!old?.createdAt || new Date(old.createdAt).getTime() > cutover.getTime()) {
    return null;
  }

  const user = (await strapi.db
    .query(USER_UID)
    .findOne({ where: { id: Number(validation.userId) }, select: ['documentId'] })) as {
    documentId?: string;
  } | null;

  if (!user?.documentId) {
    return null;
  }

  // The manager's own revoke reads and then deletes, and tells both of two racing requests it
  // succeeded. This delete names the session, its user and the origin in one statement, and its
  // count says whether this request removed it.
  const { count } = (await strapi.db.query(LEGACY_SESSION_UID).deleteMany({
    where: { sessionId: validation.sessionId, userId: validation.userId, origin: LEGACY_ORIGIN },
  })) as { count: number };

  if (count !== 1) {
    return null;
  }

  const next = await engine.createSession(user.documentId, {
    userAgent: headers?.get('user-agent'),
    ...(old.deviceId ? { deviceId: old.deviceId } : {}),
  });

  // A device that only ever comes back to refresh is still on an old token: it counts as one, so
  // the hit counter shows when the cut-off can be set
  (strapi.plugin(PLUGIN_ID).service('compat') as ReturnType<typeof compatService>).recordLegacyHit(
    'access'
  );

  return next.token;
};

/**
 * `POST /api/auth/refresh`: the refresh token from the cookie, or from the body's `refreshToken`
 * when there is no cookie. A session token is rotated, an old refresh token exchanged. The answer
 * is `{ jwt, refreshToken }`, both the new token, or `{ jwt }` and the cookie.
 */
export const refresh = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { body, headers }: RequestInput
): Promise<CompatResult> => {
  if (!cfg.refresh.enabled) {
    return NOT_FOUND;
  }

  const token = readRefreshToken(cfg, headers, body);

  if (!token) {
    return { status: 400, body: upError('BadRequestError', 'Missing refresh token') };
  }

  const engine = engineOf(strapi);

  try {
    const session = await engine.getSession(asBearer(token));
    const next = session
      ? await rotate(engine, session, headers)
      : await exchangeLegacy(strapi, cfg, engine, token, headers);

    if (next === null) {
      return INVALID_REFRESH_TOKEN;
    }

    return wantsRefreshCookie(cfg, headers)
      ? ok({ jwt: next }, [writeRefreshCookie(cfg, next)])
      : ok({ jwt: next, refreshToken: next });
  } catch (error) {
    const refused = refusedSession(error);

    if (refused === null) {
      throw error;
    }

    return refused;
  }
};

/** The session a plain logout ends: the one the refresh token names, the caller's own otherwise. */
const sessionToEnd = async (
  engine: AuthEngine,
  cfg: CompatConfig,
  caller: EngineSession,
  { body, headers }: RequestInput
): Promise<string> => {
  const token = readRefreshToken(cfg, headers, body);
  const named = token ? await engine.getSession(asBearer(token)) : null;

  return named?.userId === caller.userId ? named.id : caller.id;
};

/**
 * `POST /api/auth/logout`: `{ scope: 'all' }` signs every session of the caller out,
 * `{ deviceId }` the sessions of one device, anything else the current session, or the one the
 * refresh token names. A failure while revoking is logged and the answer is `{ ok: true }` anyway.
 * The refresh cookie is cleared when the request carries it or would have been given one.
 */
export const logout = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  input: RequestInput
): Promise<CompatResult> => {
  if (!cfg.refresh.enabled) {
    return NOT_FOUND;
  }

  const engine = engineOf(strapi);
  const caller = await callerOf(engine, input.headers);

  if (!caller) {
    return MISSING_AUTHENTICATION;
  }

  const { scope, deviceId } = plain(input.body);
  const device = nonEmpty(deviceId);

  try {
    if (scope === 'all') {
      // The engine signs out the old Users & Permissions sessions with the rest
      await engine.revokeSessions(caller.userId);
    } else if (device) {
      await engine.revokeDevice(caller.userId, device);
      await revokeLegacySessions(strapi, caller.userId, device);
    } else {
      await engine.revokeSession(caller.userId, await sessionToEnd(engine, cfg, caller, input));
    }
  } catch (error) {
    strapi.log.error('Logout failed', error);
  }

  const clear =
    wantsRefreshCookie(cfg, input.headers) || hasRefreshCookie(cfg, input.headers)
      ? [clearRefreshCookie(cfg)]
      : [];

  return ok({ ok: true }, clear);
};

/**
 * `GET /api/auth/sessions`: the caller's active sessions, the current one first and then the most
 * recently used. A session shows when it began, a device name read from its user agent, and never
 * its token.
 */
export const sessions = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { headers }: RequestInput
): Promise<CompatResult> => {
  if (!cfg.refresh.enabled) {
    return NOT_FOUND;
  }

  const engine = engineOf(strapi);
  const caller = await callerOf(engine, headers);

  if (!caller) {
    return MISSING_AUTHENTICATION;
  }

  const held = await engine.listSessions(caller.userId);
  const data = held.map((session) =>
    sanitizeSessionEntry(
      {
        sessionId: session.id,
        deviceId: session.deviceId ?? undefined,
        createdAt: session.updatedAt,
        metadata: {
          loginAt: session.createdAt.toISOString(),
          deviceName: getDeviceName(session.userAgent),
        },
      },
      caller.id
    )
  );

  return ok({ data: sortSessionsForDisplay(data) });
};

/**
 * `DELETE /api/auth/sessions/:sessionId`: signs one of the caller's sessions out. Another user's
 * session, or none, is `Session not found`.
 */
export const revokeSession = async (
  strapi: Core.Strapi,
  cfg: CompatConfig,
  { headers, sessionId }: RequestInput & { sessionId: string }
): Promise<CompatResult> => {
  if (!cfg.refresh.enabled) {
    return NOT_FOUND;
  }

  const engine = engineOf(strapi);
  const caller = await callerOf(engine, headers);

  if (!caller) {
    return MISSING_AUTHENTICATION;
  }

  try {
    await engine.revokeSession(caller.userId, sessionId);
  } catch (error) {
    if (error instanceof errors.NotFoundError) {
      return { status: 404, body: upError('NotFoundError', 'Session not found') };
    }

    throw error;
  }

  return ok({ data: {} });
};
