import type { Core } from '@strapi/types';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { INTERNAL_CACHE_NS } from '@strapi/utils';
import { AdminUser } from '../../../../shared/contracts/shared';

const createAiAdminService = ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * AI tokens are cached on the process-local memory provider only (`provider: 'memory'`),
   * key format: `${projectId}:${userId}` — see {@link INTERNAL_CACHE_NS.EE_AI_TOKEN}.
   */

  const isEnabled = (): boolean => {
    const configEnabled = strapi.config.get('admin.ai.enabled', true) === true;
    const licenseEnabled = strapi.ee?.features?.isEnabled('cms-ai') === true;
    return configEnabled && licenseEnabled;
  };

  const getAiFeatureConfig = async () => {
    if (!isEnabled()) {
      return {
        isAiI18nConfigured: false,
        isAiMediaLibraryConfigured: false,
      };
    }

    const i18nSettings = await strapi.plugin('i18n').service('settings').getSettings();
    const uploadSettings = await strapi.plugin('upload').service('upload').getSettings();

    return {
      isAiI18nConfigured: Boolean(i18nSettings?.aiLocalizations),
      isAiMediaLibraryConfigured: Boolean(uploadSettings?.aiMetadata),
    };
  };

  /**
   * Resolves the shared context required by both getAiToken and getAiUsage:
   * EE license, project ID, and AI server URL.
   */
  const resolveAiContext = (errorPrefix: string) => {
    if (!isEnabled()) {
      strapi.log.error(`${errorPrefix} AI is not enabled`);
      throw new Error(`${errorPrefix.replace(/:$/, '')}. Check server logs for details.`);
    }

    if (!strapi.ee?.isEE) {
      strapi.log.error(`${errorPrefix} Enterprise Edition features are not enabled`);
      throw new Error(`${errorPrefix.replace(/:$/, '')}. Check server logs for details.`);
    }

    let eeLicense = process.env.STRAPI_LICENSE;

    if (!eeLicense) {
      try {
        const licensePath = path.join(strapi.dirs.app.root, 'license.txt');
        eeLicense = fs.readFileSync(licensePath).toString();
      } catch {
        // License file doesn't exist or can't be read
      }
    }

    if (!eeLicense) {
      strapi.log.error(
        `${errorPrefix} No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.`
      );
      throw new Error(`${errorPrefix.replace(/:$/, '')}. Check server logs for details.`);
    }

    const projectId = strapi.config.get('uuid');
    if (!projectId) {
      strapi.log.error(`${errorPrefix} Project ID not configured`);
      throw new Error(`${errorPrefix.replace(/:$/, '')}. Check server logs for details.`);
    }

    const aiServerUrl = process.env.STRAPI_AI_URL || 'https://strapi-ai.apps.strapi.io';

    return { eeLicense, projectId, aiServerUrl };
  };

  const getAiToken = async () => {
    const ERROR_PREFIX = 'AI token request failed:';

    const { eeLicense, projectId, aiServerUrl } = resolveAiContext(ERROR_PREFIX);

    // Get the current user
    const user = strapi.requestContext.get()?.state?.user as AdminUser | undefined;
    if (!user) {
      strapi.log.error(`${ERROR_PREFIX} No authenticated user in request context`);
      throw new Error('AI token request failed. Check server logs for details.');
    }

    // Create a secure user identifier using only user ID
    const userIdentifier = user.id.toString();

    const cacheKey = `${projectId}:${userIdentifier}`;
    const cachedEntry = await strapi.cacheManager.get(INTERNAL_CACHE_NS.EE_AI_TOKEN, cacheKey, {
      provider: 'memory',
    });

    if (cachedEntry?.value && typeof cachedEntry.value === 'object' && cachedEntry.value !== null) {
      const cachedToken = cachedEntry.value as { token: string; expiresAt?: string };
      strapi.log.info('Using cached AI token');

      return {
        token: cachedToken.token,
        expiresAt: cachedToken.expiresAt,
      };
    }

    strapi.log.http('Contacting AI Server for token generation');

    try {
      const response = await fetch(`${aiServerUrl}/auth/getAiJWT`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

        throw new Error('AI token request failed. Check server logs for details.');
      }

      let data;
      try {
        data = (await response.json()) as {
          jwt: string;
          expiresAt?: string;
        };
      } catch (parseError) {
        strapi.log.error(`${ERROR_PREFIX} Failed to parse AI server response`, parseError);
        throw new Error('AI token request failed. Check server logs for details.');
      }

      if (!data.jwt) {
        strapi.log.error(`${ERROR_PREFIX} Invalid response: missing JWT token`);
        throw new Error('AI token request failed. Check server logs for details.');
      }

      strapi.log.info('AI token generated successfully', {
        userId: user.id,
        expiresAt: data.expiresAt,
      });

      if (data.expiresAt) {
        const expiresAtMs = new Date(data.expiresAt).getTime();
        const bufferMs = 2 * 60 * 1000; // 2 minutes — drop cache before JWT becomes too short-lived to use
        await strapi.cacheManager.set(
          INTERNAL_CACHE_NS.EE_AI_TOKEN,
          cacheKey,
          { token: data.jwt, expiresAt: data.expiresAt },
          {
            provider: 'memory',
            expiresAt: new Date(expiresAtMs - bufferMs),
          }
        );
      }

      // Note: Token expires in 1 hour, client should handle refresh
      return {
        token: data.jwt,
        expiresAt: data.expiresAt,
      };
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        strapi.log.error(`${ERROR_PREFIX} Request to AI server timed out`);
        throw new Error('AI token request failed. Check server logs for details.');
      }

      throw fetchError;
    }
  };

  const getAiUsage = async () => {
    const ERROR_PREFIX = 'AI usage data request failed:';

    const { eeLicense, projectId, aiServerUrl } = resolveAiContext(ERROR_PREFIX);

    strapi.log.http('Contacting AI Server for usage data');

    try {
      const response = await fetch(`${aiServerUrl}/cms/ai-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

        throw new Error('AI usage data request failed. Check server logs for details.');
      }

      let data;
      try {
        data = (await response.json()) as {
          data: { cmsAiCreditsUsed: number };
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
        throw new Error('AI usage data request failed. Check server logs for details.');
      }

      return {
        ...data.data,
        subscription: data.subscription,
      };
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        strapi.log.error(`${ERROR_PREFIX} Request to AI server timed out`);
        throw new Error('AI usage data request failed. Check server logs for details.');
      }

      throw fetchError;
    }
  };

  return {
    isEnabled,
    getAiFeatureConfig,
    getAiToken,
    getAiUsage,
  };
};

export { createAiAdminService };
