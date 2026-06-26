import { getDeviceName } from '@strapi/utils';

type SessionEntryLike = {
  sessionId: string;
  deviceId?: string;
  createdAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

type SanitizedSessionEntry = {
  id: string;
  deviceId?: string;
  deviceName?: string;
  current: boolean;
  loginAt?: string;
  lastActiveAt?: string;
  ip?: string;
};

type SessionDisplayEntry = {
  current: boolean;
  lastActiveAt?: string;
};

export const sanitizeSessionEntry = (
  session: SessionEntryLike,
  currentSessionId?: string
): SanitizedSessionEntry => {
  const metadata = session.metadata ?? {};
  const isCurrentSession =
    currentSessionId !== undefined &&
    currentSessionId !== '' &&
    session.sessionId === currentSessionId;

  return {
    id: session.sessionId,
    deviceId: session.deviceId,
    deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : undefined,
    current: isCurrentSession,
    loginAt: typeof metadata.loginAt === 'string' ? metadata.loginAt : undefined,
    // The active record is re-created on each rotation, so its creation time is the
    // best available "last used" signal without an extra write per request.
    lastActiveAt:
      session.createdAt !== undefined && session.createdAt !== null
        ? new Date(session.createdAt).toISOString()
        : undefined,
    ip: typeof metadata.ip === 'string' ? metadata.ip : undefined,
  };
};

export const buildSessionMetadata = (params: {
  ip?: string;
  userAgent?: string | null;
  loginAt?: string;
}): Record<string, unknown> => {
  const deviceName = getDeviceName(params.userAgent);

  return {
    loginAt: params.loginAt ?? new Date().toISOString(),
    ip: params.ip,
    ...(deviceName !== undefined ? { deviceName } : {}),
  };
};

export const sortSessionsForDisplay = <T extends SessionDisplayEntry>(sessions: T[]): T[] =>
  [...sessions].sort((a, b) => {
    if (a.current !== b.current) {
      return a.current ? -1 : 1;
    }

    return (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '');
  });
