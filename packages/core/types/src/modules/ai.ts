import type * as Documents from './documents';
import type * as MCP from './mcp';

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

export interface AiService {
  generateLocalizations: ({
    document,
    targetLocales,
    translateableContent,
    minimalContentTypeSchema,
  }: {
    document: Documents.AnyDocument;
    targetLocales: any[];
    // TODO right type?
    translateableContent: Record<string, unknown>;
    minimalContentTypeSchema: Record<string, Record<string, unknown>>;
  }) => Promise<{
    localizations: Array<{ content: Record<string, unknown>; locale: string }>;
  }>;
}

export type AiNamespace = {
  admin: AiAdminService;
  service: AiService;
  mcp: MCP.McpService;
};
