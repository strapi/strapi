import type { Core } from '@strapi/types';
import {
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
  SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS,
  type TokenEndpointAuthMethod,
} from '../constants';
import { isAllowedRedirectUri } from '../utils/redirect-uri';
import { sendOAuthError } from '../utils/oauth-errors';
import type { McpOAuthHandlerDependencies } from './types';

const MAX_REDIRECT_URIS = 10;

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const getOptionalString = (
  body: Record<string, unknown>,
  name: string,
  maxLength: number
): string | undefined | null => {
  const value = body[name];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    return null;
  }

  return value;
};

type RegistrationMetadata = {
  redirectUris: string[];
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  name?: string;
  clientUri?: string;
  logoUri?: string;
  scope?: string;
};

type MetadataResult =
  | { ok: true; metadata: RegistrationMetadata }
  | { ok: false; error: 'invalid_redirect_uri' | 'invalid_client_metadata'; description: string };

const invalidMetadata = (description: string): MetadataResult => ({
  ok: false,
  error: 'invalid_client_metadata',
  description,
});

const parseRedirectUris = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_REDIRECT_URIS) {
    return null;
  }

  return value.every((uri) => isAllowedRedirectUri(uri)) ? (value as string[]) : null;
};

const isSupportedGrantTypeList = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.length > 0 &&
    value.every((type) => (SUPPORTED_GRANT_TYPES as readonly string[]).includes(type)));

const isSupportedResponseTypeList = (value: unknown): boolean =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every((type) => (SUPPORTED_RESPONSE_TYPES as readonly string[]).includes(type)));

const parseClientMetadata = (body: Record<string, unknown>): MetadataResult => {
  const redirectUris = parseRedirectUris(body.redirect_uris);

  if (redirectUris === null) {
    return {
      ok: false,
      error: 'invalid_redirect_uri',
      description: `redirect_uris must contain 1-${MAX_REDIRECT_URIS} allowed redirect URIs (https, loopback http, or a safe custom scheme; no fragments)`,
    };
  }

  const tokenEndpointAuthMethod = body.token_endpoint_auth_method ?? 'client_secret_basic';

  if (
    !SUPPORTED_TOKEN_ENDPOINT_AUTH_METHODS.includes(
      tokenEndpointAuthMethod as TokenEndpointAuthMethod
    )
  ) {
    return invalidMetadata('Unsupported token_endpoint_auth_method');
  }

  if (!isSupportedGrantTypeList(body.grant_types)) {
    return invalidMetadata('grant_types may only contain authorization_code and refresh_token');
  }

  if (!isSupportedResponseTypeList(body.response_types)) {
    return invalidMetadata('response_types may only contain code');
  }

  // 255: the client name is stored in a varchar(255) column.
  const name = getOptionalString(body, 'client_name', 255);
  const clientUri = getOptionalString(body, 'client_uri', 2000);
  const logoUri = getOptionalString(body, 'logo_uri', 2000);
  const scope = getOptionalString(body, 'scope', 512);

  if (name === null || clientUri === null || logoUri === null || scope === null) {
    return invalidMetadata('Invalid client metadata value');
  }

  if (clientUri !== undefined && !isHttpUrl(clientUri)) {
    return invalidMetadata('client_uri must be an http(s) URL');
  }

  if (logoUri !== undefined && !isHttpUrl(logoUri)) {
    return invalidMetadata('logo_uri must be an http(s) URL');
  }

  return {
    ok: true,
    metadata: {
      redirectUris,
      tokenEndpointAuthMethod: tokenEndpointAuthMethod as TokenEndpointAuthMethod,
      ...(name !== undefined ? { name } : {}),
      ...(clientUri !== undefined ? { clientUri } : {}),
      ...(logoUri !== undefined ? { logoUri } : {}),
      ...(scope !== undefined ? { scope } : {}),
    },
  };
};

/**
 * POST /mcp/oauth/register — RFC 7591 dynamic client registration. Registration is open
 * (standard for MCP): a registered client grants nothing by itself, every grant still
 * requires an admin to authenticate and consent.
 */
export const createRegisterHandler =
  (deps: McpOAuthHandlerDependencies): Core.MiddlewareHandler =>
  async (ctx) => {
    const { clientStore } = deps;
    const body = ctx.request.body as Record<string, unknown> | undefined;

    ctx.set('Cache-Control', 'no-store');
    ctx.set('Pragma', 'no-cache');

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return sendOAuthError(
        ctx,
        400,
        'invalid_client_metadata',
        'Request body must be a JSON object'
      );
    }

    const parsed = parseClientMetadata(body);

    if (!parsed.ok) {
      return sendOAuthError(ctx, 400, parsed.error, parsed.description);
    }

    // Lazy cleanup: open registration must not let abandoned registrations pile up.
    await clientStore.cleanupUnusedDynamicClients();

    const { client, clientSecret } = await clientStore.register({
      ...parsed.metadata,
      registrationSource: 'dynamic',
    });

    ctx.status = 201;
    ctx.body = {
      client_id: client.clientId,
      ...(clientSecret !== null
        ? { client_secret: clientSecret, client_secret_expires_at: 0 }
        : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: client.redirectUris,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      ...(client.name !== null ? { client_name: client.name } : {}),
      ...(client.scope !== null ? { scope: client.scope } : {}),
      ...(client.clientUri !== null ? { client_uri: client.clientUri } : {}),
      ...(client.logoUri !== null ? { logo_uri: client.logoUri } : {}),
    };
  };
