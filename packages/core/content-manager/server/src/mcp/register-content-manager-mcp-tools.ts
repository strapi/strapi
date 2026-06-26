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

  const i18nPlugin = strapi.plugin('i18n');

  let localeCodes = null;
  let defaultLocale: string | null = null;
  if (i18nPlugin !== undefined) {
    localeCodes = (await i18nPlugin.service('locales').find()).map(
      (locale: { code: string }) => locale.code
    ) as [string, ...string[]];
    defaultLocale = await i18nPlugin.service('locales').getDefaultLocale();
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
