import type { Context } from 'koa';
import { isNil } from 'lodash/fp';
import { env } from '@strapi/utils';
import { getService } from '../utils';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

export default {
  // NOTE: Overrides CE admin controller
  async getProjectType() {
    const flags = strapi.config.get('admin.flags', {});
    const ai = strapi.config.get('admin.ai', {});
    try {
      return {
        data: {
          isEE: strapi.EE,
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type,
          ai,
        },
      };
    } catch (err) {
      return { data: { isEE: false, features: [], flags } };
    }
  },

  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;

    let shouldNotify = false;
    let licenseLimitStatus = null;
    let enforcementUserCount;

    const currentActiveUserCount = await getService('user').getCurrentActiveUserCount();

    const eeDisabledUsers = await getService('seat-enforcement').getDisabledUserList();

    if (eeDisabledUsers) {
      enforcementUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      enforcementUserCount = currentActiveUserCount;
    }

    if (!isNil(permittedSeats) && enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (!isNil(permittedSeats) && enforcementUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    const data = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      aiLicenseKey: env('STRAPI_ADMIN_AI_LICENSE'),
      type: strapi.ee.type,
      isTrial: strapi.ee.isTrial,
      features: strapi.ee.features.list() ?? [],
    };

    return { data };
  },

  async getAiUsage(ctx: Context) {
    const ERROR_PREFIX = 'AI usage data request failed:';
    const USER_ERROR_MESSAGE = 'AI usage data request failed. Check server logs for details.';
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

    // Get project ID
    const projectId = strapi.config.get('uuid');
    if (!projectId) {
      strapi.log.error(`${ERROR_PREFIX} Project ID not configured`);
      return ctx.internalServerError(USER_ERROR_MESSAGE);
    }

    try {
      // Call the AI server's getAiJWT endpoint
      const response = await fetch(`${aiServerUrl}/cms/ai-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No authorization header needed for public endpoint
          // Add request ID for tracing
          'X-Request-Id': crypto.randomUUID(),
        },
        body: JSON.stringify({
          eeKey: eeLicense,
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
          data: {
            cmsAiCreditsUsed: number;
          };
          subscription: {
            subscriptionId: string;
            planPriceId: string;
            subscriptionStatus: string;
            isActiveSubscription: boolean;
            cmsAiEnabled: boolean;
            cmsAiCreditsBase: number;
            cmsAiCreditsMaxUsage: number;
            currentTermStart: string;
            currentTermEnd: string;
          };
        };
      } catch (parseError) {
        strapi.log.error(`${ERROR_PREFIX} Failed to parse AI server response`, parseError);
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      ctx.body = {
        ...data.data,
        subscription: data.subscription,
      };
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        strapi.log.error(`${ERROR_PREFIX} Request to AI server timed out`);
        return ctx.internalServerError(USER_ERROR_MESSAGE);
      }

      throw fetchError;
    }
  },
};
