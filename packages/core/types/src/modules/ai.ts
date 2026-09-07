import type * as MCP from './mcp';

export type AiProvider = {
  name: string;
  isAvailable?: () => boolean;
  validate?: () => Promise<void> | void;
};

/**
 * AI service for the admin panel. Only present at runtime when EE + an AI license feature is active
 */
export type AiAdminService = {
  isAvailable(): boolean;
  isStrapiManagedAiEnabled(): boolean;
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
