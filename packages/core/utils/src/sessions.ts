import { getDeviceName } from './user-agent';

export interface SessionEntryLike {
  sessionId: string;
  deviceId?: string;
  createdAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SanitizedSessionEntry {
  id: string;
  deviceId?: string;
  deviceName?: string;
  current: boolean;
  loginAt?: string;
  lastActiveAt?: string;
}

export interface SessionDisplayEntry {
  current: boolean;
  lastActiveAt?: string;
}

/**
 * Sanitizes a session record for client consumption (active devices UI/API).
 * Never includes tokens or internal database identifiers.
 */
export const sanitizeSessionEntry = (
  session: SessionEntryLike,
  currentSessionId?: string
): SanitizedSessionEntry => {
  const metadata = session.metadata ?? {};

  return {
    id: session.sessionId,
    deviceId: session.deviceId,
    deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : undefined,
    current: Boolean(currentSessionId) && session.sessionId === currentSessionId,
    loginAt: typeof metadata.loginAt === 'string' ? metadata.loginAt : undefined,
    // The active record is re-created on each rotation, so its creation time is the
    // best available "last used" signal without an extra write per request.
    lastActiveAt: session.createdAt ? new Date(session.createdAt).toISOString() : undefined,
  };
};

/**
 * Builds origin-defined session metadata from generic request context fields.
 */
export const buildSessionMetadata = (params: {
  userAgent?: string | null;
  loginAt?: string;
}): Record<string, unknown> => {
  const deviceName = getDeviceName(params.userAgent);

  return {
    loginAt: params.loginAt ?? new Date().toISOString(),
    ...(deviceName ? { deviceName } : {}),
  };
};

/**
 * Sorts sessions for display: current session first, then most recently used.
 */
export const sortSessionsForDisplay = <T extends SessionDisplayEntry>(sessions: T[]): T[] =>
  [...sessions].sort((a, b) => {
    if (a.current !== b.current) {
      return a.current ? -1 : 1;
    }

    return (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '');
  });
