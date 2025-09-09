import type { Context } from 'koa';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AdminUser } from '../../../shared/contracts/shared';

import { getService } from '../utils';
import { validateProfileUpdateInput } from '../validation/user';
import { GetMe, GetOwnPermissions, UpdateMe, GetAiToken } from '../../../shared/contracts/users';

export default {
  async getMe(ctx: Context) {
    const userInfo = getService('user').sanitizeUser(ctx.state.user as AdminUser);

    ctx.body = {
      data: userInfo,
    } satisfies GetMe.Response;
  },

  async updateMe(ctx: Context) {
    const input = ctx.request.body as UpdateMe.Request['body'];

    await validateProfileUpdateInput(input);

    const userService = getService('user');
    const authServer = getService('auth');

    const { currentPassword, ...userInfo } = input;

    if (currentPassword && userInfo.password) {
      const isValid = await authServer.validatePassword(currentPassword, ctx.state.user.password);

      if (!isValid) {
        return ctx.badRequest('ValidationError', {
          currentPassword: ['Invalid credentials'],
        });
      }
    }

    const updatedUser = await userService.updateById(ctx.state.user.id, userInfo);

    ctx.body = {
      data: userService.sanitizeUser(updatedUser),
    } satisfies UpdateMe.Response;
  },

  async getOwnPermissions(ctx: Context) {
    const { findUserPermissions, sanitizePermission } = getService('permission');
    const { user } = ctx.state;

    const userPermissions = await findUserPermissions(user as AdminUser);

    ctx.body = {
      // @ts-expect-error - transform response type to sanitized permission
      data: userPermissions.map(sanitizePermission),
    } satisfies GetOwnPermissions.Response;
  },

  async getAiToken(ctx: Context) {
    const ERROR_PREFIX = 'AI token request failed:';
    const USER_ERROR_MESSAGE = 'AI token request failed. Check server logs for details.';

    try {
      // Security check: Ensure user is authenticated and has proper permissions
      if (!ctx.state.user) {
        return ctx.unauthorized('Authentication required');
      }

      // Check if EE features are enabled first
      if (!strapi.ee?.isEE) {
        strapi.log.error(`${ERROR_PREFIX} Enterprise Edition features are not enabled`);
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      // Get the EE license
      // First try environment variable, then try reading from file
      let eeLicense = process.env.STRAPI_LICENSE;

      if (!eeLicense) {
        try {
          const licensePath = path.join(strapi.dirs.app.root, 'license.txt');
          eeLicense = fs.readFileSync(licensePath).toString();
        } catch (error) {
          // License file doesn't exist or can't be read
        }
      }

      if (!eeLicense) {
        strapi.log.error(
          `${ERROR_PREFIX} No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.`
        );
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      const aiServerUrl = process.env.STRAPI_ADMIN_AI_URL || process.env.STRAPI_AI_URL;

      if (!aiServerUrl) {
        strapi.log.error(
          `${ERROR_PREFIX} AI server URL not configured. Please set STRAPI_ADMIN_AI_URL or STRAPI_AI_URL environment variable.`
        );
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      // Get the current user
      const user = ctx.state.user as AdminUser;

      // Create a secure user identifier using only user ID
      const userIdentifier = user.id.toString();

      // Get project ID
      const projectId = strapi.config.get('uuid');
      if (!projectId) {
        strapi.log.error(`${ERROR_PREFIX} Project ID not configured`);
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      strapi.log.http('Contacting AI Server for token generation');

      try {
        // Call the AI server's getAiJWT endpoint
        const response = await fetch(`${aiServerUrl}/auth/getAiJWT`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No authorization header needed for public endpoint
            // Add request ID for tracing
            'X-Request-Id': crypto.randomUUID(),
          },
          body: JSON.stringify({
            eeLicense,
            userIdentifier,
            projectId,
          }),
        });

        if (!response.ok) {
          let errorData;
          let errorText;
          try {
            errorText = await response.text();
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || 'Failed to parse error response' };
          }

          strapi.log.error(`${ERROR_PREFIX} ${errorData?.error || 'Unknown error'}`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            errorText,
            projectId,
          });

          return ctx.internalServerError(USER_ERROR_MESSAGE);
        }

        let data;
        try {
          data = (await response.json()) as {
            jwt: string;
            expiresAt?: string;
          };
        } catch (parseError) {
          strapi.log.error(`${ERROR_PREFIX} Failed to parse AI server response`, parseError);
          return ctx.internalServerError(USER_ERROR_MESSAGE);
        }

        if (!data.jwt) {
          strapi.log.error(`${ERROR_PREFIX} Invalid response: missing JWT token`);
          return ctx.internalServerError(USER_ERROR_MESSAGE);
        }

        strapi.log.info('AI token generated successfully', {
          userId: user.id,
          expiresAt: data.expiresAt,
        });

        // Return the AI JWT with metadata
        // Note: Token expires in 1 hour, client should handle refresh
        ctx.body = {
          data: {
            token: data.jwt,
            expiresAt: data.expiresAt, // 1 hour from generation
          },
        } satisfies GetAiToken.Response;
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          strapi.log.error(`${ERROR_PREFIX} Request to AI server timed out`);
          return ctx.internalServerError(USER_ERROR_MESSAGE);
        }

        throw fetchError;
      }
    } catch (error) {
      strapi.log.error(
        `${ERROR_PREFIX} ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
      return ctx.internalServerError(USER_ERROR_MESSAGE);
    }
  },
};
