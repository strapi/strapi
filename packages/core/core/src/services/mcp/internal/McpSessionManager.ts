import type { Core } from '@strapi/types';
import { McpSession } from '../session';
import { McpConfiguration } from './McpConfiguration';

export class McpSessionManager {
  #sessions = new Map<string, McpSession>();

  #config: McpConfiguration;

  #strapi: Core.Strapi;

  constructor(config: McpConfiguration, strapi: Core.Strapi) {
    this.#config = config;
    this.#strapi = strapi;
  }

  get(id: string): McpSession | undefined {
    return this.#sessions.get(id);
  }

  set(id: string, session: McpSession): void {
    this.#sessions.set(id, session);
  }

  async delete(id: string): Promise<void> {
    const session = this.#sessions.get(id);
    if (session === undefined) {
      return;
    }
    try {
      await session.server.close();
    } catch (err) {
      this.#strapi.log.error('[MCP] Error closing server for session', {
        sessionId: id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      this.#sessions.delete(id);
    }
  }

  hasReachedMaxSessions(): boolean {
    return this.#sessions.size >= this.#config.maxSessions;
  }

  get size(): number {
    return this.#sessions.size;
  }

  cleanupIdleSessions(): string[] {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.#sessions.entries()) {
      const idleTime = now - session.lastActivity;
      if (idleTime >= this.#config.sessionIdleTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      const session = this.#sessions.get(sessionId);
      if (session !== undefined) {
        session.server.close().catch((err) => {
          this.#strapi.log.error('[MCP] Error closing expired session', {
            sessionId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        });
        this.#sessions.delete(sessionId);
        this.#strapi.log.info('[MCP] Expired session cleaned up', { sessionId });
      }
    }

    return expiredSessions;
  }

  async closeAllSessions(): Promise<{
    erroredSessionMessages: string[];
    hasErrors: boolean;
  }> {
    const closeSessionPromises = Array.from(this.#sessions.entries()).map(
      async ([sessionId, { server, transport }]) =>
        Promise.allSettled([transport.close(), server.close()]).then(
          ([transportResult, serverResult]) => ({
            sessionId,
            transportResult,
            serverResult,
          })
        )
    );

    const closedSessions = await Promise.all(closeSessionPromises);

    const erroredSessionMessages = closedSessions
      .filter(
        ({ transportResult, serverResult }) =>
          transportResult.status === 'rejected' || serverResult.status === 'rejected'
      )
      .map(
        ({ sessionId, transportResult, serverResult }) =>
          `session ${sessionId}: ${
            transportResult.status === 'rejected'
              ? `Transport error: ${transportResult.reason instanceof Error ? transportResult.reason.message : String(transportResult.reason)}.`
              : ''
          } ${
            serverResult.status === 'rejected'
              ? `Server error: ${serverResult.reason instanceof Error ? serverResult.reason.message : String(serverResult.reason)}.`
              : ''
          }`
      );

    this.#sessions.clear();

    return {
      erroredSessionMessages,
      hasErrors: erroredSessionMessages.length > 0,
    };
  }
}
