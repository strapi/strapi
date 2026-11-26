import type { errors } from '@strapi/utils';

/**
 * A single active session of the current admin user, sanitized for client consumption.
 * Never includes tokens, the raw userId, or the internal database id.
 */
export interface SanitizedAdminSession {
  /** The session identifier, used to target a specific session for revocation. */
  id: string;
  /** Stable device identifier that originated the session, when available. */
  deviceId?: string;
  /** Human-readable device label derived from the User-Agent (e.g. "Chrome on macOS"). */
  deviceName?: string;
  /** Whether this is the session backing the current request. */
  current: boolean;
  /** ISO timestamp of the original login that created this session family. */
  loginAt?: string;
  /** ISO timestamp of the last time this session was refreshed/used. */
  lastActiveAt?: string;
}

/**
 * GET /admin/users/me/sessions - List the current admin user's active sessions
 */
export declare namespace GetSessions {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: SanitizedAdminSession[];
    error?: errors.ApplicationError;
  }
}

/**
 * DELETE /admin/users/me/sessions/:sessionId - Revoke a single session
 */
export declare namespace DeleteSession {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: {};
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * DELETE /admin/users/me/sessions - Revoke all sessions of the current user.
 * When `keepCurrent` is true, the session backing the current request is preserved
 * (i.e. "log out of all other devices").
 */
export declare namespace DeleteAllSessions {
  export interface Request {
    query: {
      keepCurrent?: boolean;
    };
    body: {};
  }

  export interface Response {
    data: {};
    error?: errors.ApplicationError;
  }
}
