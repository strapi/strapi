import crypto from 'node:crypto';
import type { Core } from '@strapi/types';
import { verifyConsentTicket } from '../services/consent-ticket';
import { isRegisteredRedirectUri } from '../utils/redirect-uri';
import { buildCodeRedirect, buildErrorRedirect } from '../utils/oauth-errors';
import type { McpOAuthClient } from '../services/client-store';
import type { ConsentTicketPayload } from '../services/consent-ticket';
import type { McpOAuthHandlerDependencies } from './types';

const INVALID_TICKET_MESSAGE =
  'This authorization request is invalid or has expired. Restart the connection from your MCP client.';

const resolveTicket = async (
  ticket: unknown,
  deps: McpOAuthHandlerDependencies
): Promise<{ payload: ConsentTicketPayload; client: McpOAuthClient } | null> => {
  const payload = verifyConsentTicket(ticket, deps.config.getJwtSecret());

  if (payload === null) {
    return null;
  }

  const client = await deps.clientStore.findByClientId(payload.clientId);

  // Re-check the client and redirect URI at consent time: registration may have changed
  // between the authorize redirect and the approval.
  if (!client || !isRegisteredRedirectUri(client.redirectUris, payload.redirectUri)) {
    return null;
  }

  return { payload, client };
};

/**
 * GET /admin/mcp/oauth/authorization-request — returns what the consent screen displays.
 * Admin-authenticated (any admin strategy); grants nothing by itself.
 */
export const createGetAuthorizationRequestHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  async (ctx) => {
    const resolved = await resolveTicket(ctx.query.ticket, deps);

    if (resolved === null) {
      return ctx.badRequest(INVALID_TICKET_MESSAGE, { code: 'invalid_ticket' });
    }

    const { payload, client } = resolved;

    let redirectHost = payload.redirectUri;
    try {
      redirectHost = new URL(payload.redirectUri).host || payload.redirectUri;
    } catch {
      // Custom-scheme URIs may have no host; fall back to the full URI.
    }

    ctx.body = {
      data: {
        client: {
          name: client.name ?? client.clientId,
          ...(client.clientUri !== null ? { uri: client.clientUri } : {}),
          ...(client.logoUri !== null ? { logoUri: client.logoUri } : {}),
        },
        redirectUri: payload.redirectUri,
        redirectHost,
        ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
      },
    };
  };

/**
 * POST /admin/mcp/oauth/consent — records the admin's decision. On approval it issues the
 * single-use authorization code; either way it returns the URL the browser must be sent to.
 *
 * Only a human admin session may decide: API tokens (which also pass admin-route
 * authentication) are rejected.
 */
export const createSubmitConsentHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  async (ctx) => {
    if (!ctx.state.session) {
      return ctx.forbidden('MCP OAuth consent requires an admin session');
    }

    const body = ctx.request.body as Record<string, unknown> | undefined;
    const decision = body?.decision;

    if (decision !== 'approve' && decision !== 'deny') {
      return ctx.badRequest('decision must be "approve" or "deny"');
    }

    const resolved = await resolveTicket(body?.ticket, deps);

    if (resolved === null) {
      return ctx.badRequest(INVALID_TICKET_MESSAGE, { code: 'invalid_ticket' });
    }

    const { payload, client } = resolved;
    const iss = deps.config.issuer;

    if (decision === 'deny') {
      deps.strapi.log.info(
        `[MCP] OAuth authorization denied by user ${ctx.state.user.id} for client ${client.clientId}`
      );
      ctx.body = {
        data: {
          redirectTo: buildErrorRedirect(payload.redirectUri, {
            error: 'access_denied',
            errorDescription: 'The user denied the authorization request',
            state: payload.state,
            iss,
          }),
        },
      };
      return;
    }

    const grantId = crypto.randomUUID();

    deps.strapi.log.info(
      `[MCP] OAuth authorization approved by user ${ctx.state.user.id} for client ${client.clientId} (grant ${grantId})`
    );

    // Marks the client as granted so the unused-client cleanup never removes it.
    await deps.clientStore.markGranted(client.clientId);

    const code = await deps.codeStore.issue(
      {
        clientId: client.clientId,
        userId: String(ctx.state.user.id),
        redirectUri: payload.redirectUri,
        codeChallenge: payload.codeChallenge,
        codeChallengeMethod: payload.codeChallengeMethod,
        ...(payload.scope !== undefined ? { scope: payload.scope } : {}),
        ...(payload.resource !== undefined ? { resource: payload.resource } : {}),
        grantId,
      },
      deps.config.authorizationCodeLifespan
    );

    ctx.body = {
      data: {
        redirectTo: buildCodeRedirect(payload.redirectUri, {
          code,
          state: payload.state,
          iss,
        }),
      },
    };
  };
