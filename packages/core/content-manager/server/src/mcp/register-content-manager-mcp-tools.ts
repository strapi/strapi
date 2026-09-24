import type { Core } from '@strapi/types';

import { deriveDisplayedContentTypeMcpToolDefinitions } from './derive-content-type-mcp-tools';
import { getService } from '../utils';

/**
 * Registers derived content-type MCP tools via strapi.ai.mcp.registerTool().
 * Must be called from the plugin register phase, before the MCP HTTP server starts.
 */
export const registerContentManagerMcpTools = async ({
  strapi,
}: {
  strapi: Core.Strapi;
}): Promise<void> => {
  // Performance only: registerTool() is safe when MCP is disabled (definitions are stored but
  // never exposed). Skip the expensive derivation below when the MCP server will not start.
  if (strapi.ai.mcp.isEnabled() !== true) {
    return;
  }

  let localeCodes: [string, ...string[]] | null = null;
  let defaultLocale: string | null = null;
  if (strapi.localization.isEnabled() === true) {
    // TODO @Nico zero locales yields `[]` cast as a non-empty tuple. Downstream copes at runtime
    // (buildLocaleSchema checks length, getPermittedLocales returns null), but the type lies.
    localeCodes = (await strapi.localization.getLocales()).map((locale) => locale.code) as [
      string,
      ...string[],
    ];
    defaultLocale = await strapi.localization.getDefaultLocale();
  }

  const models = getService('content-types').findDisplayedContentTypes();
  const tools = deriveDisplayedContentTypeMcpToolDefinitions(strapi, models, {
    localeCodes,
    defaultLocale,
  });

  for (const tool of tools) {
    strapi.ai.mcp.registerTool(tool);
  }
};
