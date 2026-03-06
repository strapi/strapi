import type * as MCP from './mcp';

// NOTE: AiAdminService is only present at runtime when EE + cms-ai feature is enabled
export type AiAdminService = {
  getAiToken(): Promise<{ token: string; expiresAt?: string }>;
  getAIFeatureConfig(): Promise<{
    isAIi18nConfigured: boolean;
    isAIMediaLibraryConfigured: boolean;
  }>;
};

export type AiNamespace = {
  mcp: MCP.McpService;
  // TODO @Nico [admin is undefined in CE; only available on EE with cms-ai feature]
  admin?: AiAdminService;
};
