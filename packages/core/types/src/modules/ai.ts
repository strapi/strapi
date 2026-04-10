/**
 * AI service for the admin panel. Only present at runtime when EE + cms-ai feature is active
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
