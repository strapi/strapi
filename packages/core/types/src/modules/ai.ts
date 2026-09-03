// TODO right import?
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
    sourceLocale,
    targetLocales,
    content,
    contentTypeSchema,
  }: {
    document: Documents.AnyDocument;
    // TODO both any types
    sourceLocale: any;
    targetLocales: any[];
    // TODO right type?
    content: Record<string, unknown>;
    contentTypeSchema: Record<string, Record<string, unknown>>;
  }) => Promise<{
    localizations: Array<{ content: Record<string, unknown>; locale: string }>;
  }>;
}

export interface AiProvidersRegistry {
  register: (provider: AiService) => void;
  // TODO no-op for now, I'd like to get rid of it
  activate: () => void;
  // TODO weird that provider registry returns an AiService;
  //      in theory, the AiService forwards the calls to a provider, so both types should be the same.
  getDefault: () => AiService;
}

export type AiNamespace = {
  admin: AiAdminService;
  // TODO rename?
  // TODO consider merging with AiAdminService (the former becomes irrelevant once we introduce abstraction)
  service: AiService;
  providers: AiProvidersRegistry;
  mcp: MCP.McpService;
};
