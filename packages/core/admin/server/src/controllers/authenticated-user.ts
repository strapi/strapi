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
    try {
      // Security check: Ensure user is authenticated and has proper permissions
      if (!ctx.state.user) {
        return ctx.unauthorized('Authentication required');
      }

      // Check if EE features are enabled first
      if (!strapi.ee?.isEE) {
        return ctx.badRequest('Enterprise Edition features are not enabled');
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
        return ctx.badRequest(
          'No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.'
        );
      }

      const aiServerUrl = process.env.STRAPI_ADMIN_AI_URL || process.env.STRAPI_AI_URL;

      if (!aiServerUrl) {
        return ctx.badRequest(
          'AI server URL not configured. Please set STRAPI_ADMIN_AI_URL or STRAPI_AI_URL environment variable.'
        );
      }

      // Get the current user
      const user = ctx.state.user as AdminUser;

      // Create a secure user identifier using only user ID
      const userIdentifier = user.id.toString();

      // Get project ID
      const projectId = strapi.config.get('uuid');
      if (!projectId) {
        return ctx.badRequest('Project ID not configured');
      }

      strapi.log.info('Making request to AI server:', {
        url: `${aiServerUrl}/auth/getAiJWT`,
        projectId,
        hasEeLicense: !!eeLicense,
        userEmail: user.email,
      });

      try {
        // Call the AI server's getAiJWT endpoint (now on public server)
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

          strapi.log.error('AI token request failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            errorText,
            projectId,
            aiServerUrl,
          });

          // Return more specific error messages
          if (response.status === 401) {
            // This shouldn't happen with the public endpoint
            const message =
              process.env.NODE_ENV === 'development'
                ? `AI server request failed. Response: ${errorText || 'No response body'}.`
                : 'AI server request failed.';
            return ctx.unauthorized(message);
          }
          if (response.status === 403) {
            return ctx.forbidden('License validation failed. Check your EE license.');
          }
          if (response.status === 404) {
            return ctx.notFound(`AI service endpoint not found at ${aiServerUrl}`);
          }

          // Include more detail in error for debugging
          return ctx.badRequest(
            `Failed to obtain AI token. Server responded with: ${response.status} ${errorText || response.statusText}`
          );
        }

        const data = (await response.json()) as {
          jwt: string;
          expiresAt?: string;
        };

        if (!data.jwt) {
          throw new Error('Invalid response: missing JWT token');
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
          strapi.log.error('AI token request timeout');
          return ctx.requestTimeout('Request to AI server timed out');
        }

        throw fetchError;
      }
    } catch (error) {
      strapi.log.error('Failed to get AI token:', error);
      ctx.internalServerError('An unexpected error occurred while obtaining the AI token');
    }
  },
};
