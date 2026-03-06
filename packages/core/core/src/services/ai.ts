import type { Core, Modules } from '@strapi/types';
import { createMcpService } from './mcp';

export const createAiNamespace = (strapi: Core.Strapi): Modules.AI.AiNamespace => {
  return {
    mcp: createMcpService(strapi),
    get admin(): Modules.AI.AiAdminService | undefined {
      try {
        return strapi.get('ai.admin');
      } catch {
        return undefined;
      }
    },
  };
};
