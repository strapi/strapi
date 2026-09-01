import type { Core, Modules } from '@strapi/types';

export const createAiNamespace = (strapi: Core.Strapi): Modules.AI.AiNamespace => ({
  get service(): Modules.AI.AiService {
    return strapi.get('ai.service');
  },

  get admin(): Modules.AI.AiAdminService {
    return strapi.get('ai.admin');
  },

  get mcp(): Modules.MCP.McpService {
    return strapi.get('ai.mcp');
  },
});
