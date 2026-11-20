import crypto from 'node:crypto';
import type { Core, Data } from '@strapi/types';
import { MCP_OAUTH_CODE_UID } from '../constants';

export interface McpOAuthAuthorizationCode {
  id: Data.ID;
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string | null;
  resource: string | null;
  grantId: string;
  expiresAt: string | Date;
  consumedAt: string | Date | null;
}

export interface IssueCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string;
  resource?: string;
  grantId: string;
}

export type ConsumeCodeResult =
  | { status: 'consumed'; row: McpOAuthAuthorizationCode }
  | { status: 'replayed'; row: McpOAuthAuthorizationCode }
  | { status: 'not_found' };

export type McpOAuthCodeStore = ReturnType<typeof createCodeStore>;

export const createCodeStore = (strapi: Core.Strapi) => {
  const getSalt = (): string => {
    const salt = strapi.config.get<string>('admin.apiToken.salt');

    if (!salt) {
      throw new Error(
        '[MCP] Missing admin.apiToken.salt. A salt is required to enable MCP OAuth authentication.'
      );
    }

    return salt;
  };

  const hashCode = (code: string): string =>
    crypto.createHmac('sha512', getSalt()).update(code).digest('hex');

  return {
    async issue(input: IssueCodeInput, lifespanSeconds: number): Promise<string> {
      const code = crypto.randomBytes(32).toString('base64url');

      await strapi.db.query(MCP_OAUTH_CODE_UID).create({
        data: {
          codeHash: hashCode(code),
          clientId: input.clientId,
          userId: input.userId,
          redirectUri: input.redirectUri,
          codeChallenge: input.codeChallenge,
          codeChallengeMethod: input.codeChallengeMethod,
          scope: input.scope ?? null,
          resource: input.resource ?? null,
          grantId: input.grantId,
          expiresAt: new Date(Date.now() + lifespanSeconds * 1000),
          consumedAt: null,
        },
      });

      return code;
    },

    /**
     * Single-use consumption. The row is marked consumed atomically; a second presentation
     * of the same code reports `replayed` so the caller can revoke the grant family.
     */
    async consume(code: unknown): Promise<ConsumeCodeResult> {
      if (typeof code !== 'string' || code.length === 0 || code.length > 256) {
        return { status: 'not_found' };
      }

      const row: McpOAuthAuthorizationCode | null = await strapi.db
        .query(MCP_OAUTH_CODE_UID)
        .findOne({ where: { codeHash: hashCode(code) } });

      if (!row) {
        return { status: 'not_found' };
      }

      if (row.consumedAt !== null) {
        return { status: 'replayed', row };
      }

      const { count } = await strapi.db.query(MCP_OAUTH_CODE_UID).updateMany({
        where: { id: row.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      if (count === 0) {
        // Lost the race against a concurrent exchange of the same code.
        return { status: 'replayed', row };
      }

      return { status: 'consumed', row };
    },

    /**
     * Deletes codes past their expiry. Consumed rows are kept until they expire so replay
     * detection keeps working for the whole code lifetime.
     */
    async cleanupExpired(): Promise<void> {
      await strapi.db.query(MCP_OAUTH_CODE_UID).deleteMany({
        where: { expiresAt: { $lt: new Date() } },
      });
    },
  };
};
