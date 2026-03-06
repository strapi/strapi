import { defineProvider } from './provider';
import { createAiNamespace } from '../services/ai';

export default defineProvider({
  init(strapi) {
    strapi.add('ai', () => createAiNamespace(strapi));
  },
  async bootstrap(strapi) {
    const { mcp } = strapi.get('ai');
    if (mcp.isEnabled() === true) {
      try {
        strapi.log.info('[MCP] Starting MCP server...');
        await mcp.start();
      } catch (error) {
        strapi.log.error('[MCP] Failed to start MCP server', { error });
      }
    } else {
      strapi.log.debug('[MCP] MCP server is disabled in configuration');
    }
  },
  async destroy(strapi) {
    const { mcp } = strapi.get('ai');
    if (mcp.isRunning() === true) {
      try {
        strapi.log.info('[MCP] Stopping MCP server...');
        await mcp.stop();
      } catch (error) {
        strapi.log.error('[MCP] Failed to stop MCP server', { error });
      }
    }
  },
});
