import type { errors } from '@strapi/utils';

/**
 * GET /ai-token - Get an AI token for the current admin user
 */
export declare namespace GetAiToken {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: {
      token: string;
      expiresAt?: string;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * GET /ai-usage - Get AI usage
 */
export declare namespace GetAiUsage {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    cmsAiCreditsUsed: number;
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
  }
}

/**
 * GET /ai-feature-config - Get AI feature config
 */
export declare namespace GetAIFeatureConfig {
  export interface Request {
    query: {};
    body: {};
  }

  export interface Response {
    data: {
      isAIi18nConfigured: boolean;
      isAIMediaLibraryConfigured: boolean;
    };
    error?: errors.ApplicationError;
  }
}
