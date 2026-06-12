import type { Context } from 'koa';
import type { Modules } from '@strapi/types';

import { getSessionManager } from '../../../shared/utils/session-auth';
import type {
  SanitizedAdminSession,
  GetSessions,
  DeleteSession,
  DeleteAllSessions,
} from '../../../shared/contracts/sessions';

const ORIGIN = 'admin';

const getCurrentSessionId = (ctx: Context): string | undefined => {
  const session = ctx.state.session as { id?: string } | undefined;
  return typeof session?.id === 'string' ? session.id : undefined;
};

const sanitizeSession = (
  session: Modules.SessionManager.SessionEntry,
  currentSessionId?: string
): SanitizedAdminSession => {
  const metadata = (session.metadata ?? {}) as {
    loginAt?: unknown;
    ip?: unknown;
    deviceName?: unknown;
  };

  return {
    id: session.sessionId,
    deviceId: session.deviceId,
    deviceName: typeof metadata.deviceName === 'string' ? metadata.deviceName : undefined,
    current: Boolean(currentSessionId) && session.sessionId === currentSessionId,
    loginAt: typeof metadata.loginAt === 'string' ? metadata.loginAt : undefined,
    // The active record is re-created on each rotation, so its creation time is the
    // best available "last used" signal without an extra write per request.
    lastActiveAt: session.createdAt ? new Date(session.createdAt).toISOString() : undefined,
    ip: typeof metadata.ip === 'string' ? metadata.ip : undefined,
  };
};

export default {
  async list(ctx: Context) {
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    const userId = String(ctx.state.user.id);
    const currentSessionId = getCurrentSessionId(ctx);
    const sessions = await sessionManager(ORIGIN).listSessions(userId);

    const data = sessions
      .map((session) => sanitizeSession(session, currentSessionId))
      // Surface the current session first, then most recently active.
      .sort((a, b) => {
        if (a.current !== b.current) {
          return a.current ? -1 : 1;
        }
        return (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? '');
      });

    ctx.body = { data } satisfies GetSessions.Response;
  },

  async revoke(ctx: Context) {
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    const userId = String(ctx.state.user.id);
    const { sessionId } = ctx.params;

    const revoked = await sessionManager(ORIGIN).revokeSessionById(userId, sessionId);
    if (!revoked) {
      return ctx.notFound('Session not found');
    }

    ctx.body = { data: {} } satisfies DeleteSession.Response;
  },

  async revokeAll(ctx: Context) {
    const sessionManager = getSessionManager();
    if (!sessionManager) {
      return ctx.internalServerError();
    }

    const userId = String(ctx.state.user.id);
    const keepCurrent = ctx.query.keepCurrent === 'true' || ctx.query.keepCurrent === '1';

    if (keepCurrent) {
      const currentSessionId = getCurrentSessionId(ctx);
      const sessions = await sessionManager(ORIGIN).listSessions(userId);

      await Promise.all(
        sessions
          .filter((session) => session.sessionId !== currentSessionId)
          .map((session) => sessionManager(ORIGIN).revokeSessionById(userId, session.sessionId))
      );
    } else {
      await sessionManager(ORIGIN).invalidateRefreshToken(userId);
    }

    ctx.body = { data: {} } satisfies DeleteAllSessions.Response;
  },
};
