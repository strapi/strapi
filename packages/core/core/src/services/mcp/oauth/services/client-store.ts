import crypto from 'node:crypto';
import type { Core, Data } from '@strapi/types';
import {
  MCP_OAUTH_CLIENT_UID,
  SUPPORTED_GRANT_TYPES,
  SUPPORTED_RESPONSE_TYPES,
  type TokenEndpointAuthMethod,
} from '../constants';

export interface McpOAuthClient {
  id: Data.ID;
  clientId: string;
  clientSecretHash: string | null;
  name: string | null;
  redirectUris: string[];
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  grantTypes: string[];
  responseTypes: string[];
  scope: string | null;
  clientUri: string | null;
  logoUri: string | null;
  registrationSource: 'dynamic' | 'config';
}

export interface RegisterClientInput {
  name?: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  scope?: string;
  clientUri?: string;
  logoUri?: string;
  registrationSource: 'dynamic' | 'config';
}

export type McpOAuthClientStore = ReturnType<typeof createClientStore>;

export const createClientStore = (strapi: Core.Strapi) => {
  const getSalt = (): string => {
    const salt = strapi.config.get<string>('admin.apiToken.salt');

    if (!salt) {
      throw new Error(
        '[MCP] Missing admin.apiToken.salt. A salt is required to enable MCP OAuth authentication.'
      );
    }

    return salt;
  };

  const hashSecret = (secret: string): string =>
    crypto.createHmac('sha512', getSalt()).update(secret).digest('hex');

  return {
    hashSecret,

    async findByClientId(clientId: string): Promise<McpOAuthClient | null> {
      if (typeof clientId !== 'string' || clientId.length === 0) {
        return null;
      }

      return strapi.db.query(MCP_OAUTH_CLIENT_UID).findOne({ where: { clientId } });
    },

    async register(
      input: RegisterClientInput
    ): Promise<{ client: McpOAuthClient; clientSecret: string | null }> {
      const clientId = crypto.randomBytes(24).toString('base64url');
      const clientSecret =
        input.tokenEndpointAuthMethod === 'none'
          ? null
          : crypto.randomBytes(32).toString('base64url');

      const client = await strapi.db.query(MCP_OAUTH_CLIENT_UID).create({
        data: {
          clientId,
          clientSecretHash: clientSecret === null ? null : hashSecret(clientSecret),
          name: input.name ?? null,
          redirectUris: input.redirectUris,
          tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
          grantTypes: [...SUPPORTED_GRANT_TYPES],
          responseTypes: [...SUPPORTED_RESPONSE_TYPES],
          scope: input.scope ?? null,
          clientUri: input.clientUri ?? null,
          logoUri: input.logoUri ?? null,
          registrationSource: input.registrationSource,
        },
      });

      return { client, clientSecret };
    },

    verifySecret(client: McpOAuthClient, secret: unknown): boolean {
      if (
        client.clientSecretHash === null ||
        typeof secret !== 'string' ||
        secret.length === 0 ||
        secret.length > 1024
      ) {
        return false;
      }

      const computed = Buffer.from(hashSecret(secret));
      const expected = Buffer.from(client.clientSecretHash);

      return computed.length === expected.length && crypto.timingSafeEqual(computed, expected);
    },
  };
};
