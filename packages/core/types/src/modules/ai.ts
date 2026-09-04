import type * as MCP from './mcp';

export type AiProvider = {
  generateLocalizations: ({
    sourceLocale,
    targetLocales,
    content,
    contentTypeSchema,
  }: {
    sourceLocale: string;
    targetLocales: string[];
    content: Record<string, unknown>;
    contentTypeSchema: Record<string, Record<string, unknown>>;
  }) => Promise<{
    localizations: Array<{ content: Record<string, unknown>; locale: string }>;
  }>;
};

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
  // TODO with this, did we just allow anyone registering their own provider? effectively bypassing byok plugin?
  registerProvider: AiProvidersRegistry['register'];
  // TODO this should not be exposed in core, this is an i18n plugin feature
  //   for fix inspiration, check how the "AI loader icon" is added to the admin UI if that's a plugin feature
  generateLocalizations: AiProvider['generateLocalizations'];
};

export interface AiProvidersRegistry {
  isEnabled: () => boolean;
  register: (provider: AiProvider) => void;
  get: () => AiProvider;
}

export type AiNamespace = {
  admin: AiAdminService;
  mcp: MCP.McpService;
};
