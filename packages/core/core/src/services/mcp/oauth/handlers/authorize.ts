import type { Core } from '@strapi/types';
import { isValidCodeChallenge } from '../utils/pkce';
import { isRegisteredRedirectUri } from '../utils/redirect-uri';
import { buildErrorRedirect, sendOAuthError } from '../utils/oauth-errors';
import { signConsentTicket } from '../services/consent-ticket';
import type { McpOAuthHandlerDependencies } from './types';

const getSingleQueryParam = (query: Record<string, unknown>, name: string): string | undefined => {
  const value = query[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const normalizeResource = (resource: string): string => resource.replace(/\/+$/, '');

/**
 * GET /mcp/oauth/authorize — validates the authorization request, then hands the browser
 * to the admin panel's consent page with a short-lived signed ticket describing the request.
 */
export const createAuthorizeHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  async (ctx) => {
    const { config, clientStore } = deps;
    const query = ctx.query as Record<string, unknown>;

    // Failures to identify the client or its redirect URI must never redirect (RFC 6749 §4.1.2.1).
    const clientId = getSingleQueryParam(query, 'client_id');

    if (clientId === undefined) {
      return sendOAuthError(ctx, 400, 'invalid_request', 'Missing client_id');
    }

    const client = await clientStore.findByClientId(clientId);

    if (!client) {
      return sendOAuthError(ctx, 400, 'invalid_client', 'Unknown client');
    }

    const redirectUri = getSingleQueryParam(query, 'redirect_uri');

    if (redirectUri === undefined || !isRegisteredRedirectUri(client.redirectUris, redirectUri)) {
      return sendOAuthError(
        ctx,
        400,
        'invalid_request',
        'redirect_uri is missing or not registered for this client'
      );
    }

    // From here on the client and redirect URI are trusted, so errors redirect back.
    const state = getSingleQueryParam(query, 'state');
    const iss = config.issuer;

    const redirectError = (
      error: Parameters<typeof buildErrorRedirect>[1]['error'],
      errorDescription: string
    ) => {
      ctx.redirect(buildErrorRedirect(redirectUri, { error, errorDescription, state, iss }));
    };

    const responseType = getSingleQueryParam(query, 'response_type');

    if (responseType !== 'code') {
      return redirectError('unsupported_response_type', 'response_type must be "code"');
    }

    const codeChallenge = getSingleQueryParam(query, 'code_challenge');
    const codeChallengeMethod = getSingleQueryParam(query, 'code_challenge_method');

    if (!isValidCodeChallenge(codeChallenge) || codeChallengeMethod !== 'S256') {
      return redirectError(
        'invalid_request',
        'PKCE is required: send code_challenge with code_challenge_method=S256'
      );
    }

    const resource = getSingleQueryParam(query, 'resource');

    if (resource !== undefined && normalizeResource(resource) !== config.resource) {
      return redirectError('invalid_target', 'Unknown resource');
    }

    const scope = getSingleQueryParam(query, 'scope');

    const ticket = signConsentTicket(
      {
        clientId: client.clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod: 'S256',
        ...(scope !== undefined ? { scope } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(resource !== undefined ? { resource: normalizeResource(resource) } : {}),
      },
      config.getJwtSecret(),
      config.consentTicketLifespan
    );

    ctx.redirect(`${config.consentPageUrl}?ticket=${encodeURIComponent(ticket)}`);
  };
