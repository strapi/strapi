/**
 * Admin AI integration (tokens, usage, feature flags). Always registered on the container;
 * call `isEnabled()` before relying on Enterprise AI behaviour.
 */
export type AiAdminService = {
  isEnabled(): boolean;
  getAiToken(): Promise<{ token: string; expiresAt?: string }>;
  getAiUsage(): Promise<{
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
  }>;
  getAiFeatureConfig(): Promise<{
    isAiI18nConfigured: boolean;
    isAiMediaLibraryConfigured: boolean;
  }>;
};

export type AiNamespace = {
  admin: AiAdminService;
};
