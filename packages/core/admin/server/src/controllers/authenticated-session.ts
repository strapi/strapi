import type { Context } from 'koa';
import { sanitizeSessionEntry, sortSessionsForDisplay } from '@strapi/utils';

import { getSessionManager } from '../../../shared/utils/session-auth';
import type {
  GetSessions,
  DeleteSession,
  DeleteAllSessions,
} from '../../../shared/contracts/sessions';

const ORIGIN = 'admin';

const getCurrentSessionId = (ctx: Context): string | undefined => {
  const session = ctx.state.session as { id?: string } | undefined;
  return typeof session?.id === 'string' ? session.id : undefined;
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

    const data = sortSessionsForDisplay(
      sessions.map((session) => sanitizeSessionEntry(session, currentSessionId))
    );

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
