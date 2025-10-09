import type { errors } from '@strapi/utils';

/**
 * GET /users/me/ai-token - Get AI token for the current admin user
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
