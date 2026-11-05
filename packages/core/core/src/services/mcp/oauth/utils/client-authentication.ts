import type { Context } from 'koa';
import type { McpOAuthClient, McpOAuthClientStore } from '../services/client-store';

export type ClientAuthenticationResult =
  | { authenticated: true; client: McpOAuthClient }
  | { authenticated: false; error: 'invalid_request' | 'invalid_client'; description: string };

const getBodyParam = (ctx: Context, name: string): string | undefined => {
  const body = ctx.request.body as Record<string, unknown> | undefined;
  const value = body?.[name];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * RFC 6749 §2.3.1: credentials in the Basic header are form-encoded before base64.
 */
const parseBasicCredentials = (
  ctx: Context
): { clientId: string; clientSecret: string } | null | 'malformed' => {
  const header = ctx.request.header.authorization;

  if (typeof header !== 'string' || !/^basic\s/i.test(header)) {
    return null;
  }

  const encoded = header.replace(/^basic\s+/i, '').trim();

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return 'malformed';
  }

  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex <= 0) {
    return 'malformed';
  }

  try {
    return {
      clientId: decodeURIComponent(decoded.slice(0, separatorIndex)),
      clientSecret: decodeURIComponent(decoded.slice(separatorIndex + 1)),
    };
  } catch {
    return 'malformed';
  }
};

/**
 * Authenticates the OAuth client calling the token/revocation endpoint, supporting the
 * 'none' (public client), 'client_secret_basic', and 'client_secret_post' methods.
 */
export const authenticateClient = async (
  ctx: Context,
  clientStore: McpOAuthClientStore
): Promise<ClientAuthenticationResult> => {
  const basic = parseBasicCredentials(ctx);

  if (basic === 'malformed') {
    return {
      authenticated: false,
      error: 'invalid_client',
      description: 'Malformed Basic authorization header',
    };
  }

  const clientId = basic?.clientId ?? getBodyParam(ctx, 'client_id');
  const clientSecret = basic?.clientSecret ?? getBodyParam(ctx, 'client_secret');

  if (clientId === undefined) {
    return {
      authenticated: false,
      error: 'invalid_request',
      description: 'Missing client_id',
    };
  }

  const client = await clientStore.findByClientId(clientId);

  if (!client) {
    return {
      authenticated: false,
      error: 'invalid_client',
      description: 'Unknown client',
    };
  }

  if (client.tokenEndpointAuthMethod === 'none') {
    // Public client: identified by client_id alone.
    return { authenticated: true, client };
  }

  if (clientSecret === undefined || !clientStore.verifySecret(client, clientSecret)) {
    return {
      authenticated: false,
      error: 'invalid_client',
      description: 'Client authentication failed',
    };
  }

  return { authenticated: true, client };
};
