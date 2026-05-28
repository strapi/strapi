import type { Core, Data } from '@strapi/types';
import type { Ability } from '@casl/ability';
import type { Context } from 'koa';

export type McpAdminTokenAbility = Ability;

export type McpAdminTokenAuthResult =
  | { authenticated: false; error?: Error }
  | {
      authenticated: true;
      credentials: { id: Data.ID };
      user: { id: Data.ID };
      ability: McpAdminTokenAbility;
    };

const extractBearerToken = (ctx: Context): string | null => {
  const authorization = ctx.request.header.authorization;

  if (authorization === undefined) {
    return null;
  }

  const parts = authorization.split(/\s+/);

  if (parts[0].toLowerCase() !== 'bearer' || parts.length !== 2) {
    return null;
  }

  return parts[1];
};

export const createMcpAdminTokenAuthenticator = (strapi: Core.Strapi) => ({
  async authenticate(ctx: Context): Promise<McpAdminTokenAuthResult> {
    const token = extractBearerToken(ctx);

    if (token === null) {
      return { authenticated: false };
    }

    const authResult = (await strapi.admin.services['api-token-admin'].authenticateAdminToken(
      token
    )) as McpAdminTokenAuthResult;

    if (authResult.authenticated === false) {
      return authResult;
    }

    return {
      authenticated: true,
      credentials: { id: authResult.credentials.id },
      user: { id: authResult.user.id },
      ability: authResult.ability,
    };
  },
});
