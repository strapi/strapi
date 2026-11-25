import type * as MCP from './mcp';

export type AiProvider = {
  name: string;
};

/**
 * AI service for the admin panel. Always registered (CE and EE), but its methods gate on
 * EE/license/config internally and report unavailable outside of that context.
 */
export type AiAdminService = {
  isAvailable(): boolean;
  isStrapiManagedAiEnabled(): boolean;
  authorizeCustomProvider(): boolean;
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
  mcp: MCP.McpService;
};
