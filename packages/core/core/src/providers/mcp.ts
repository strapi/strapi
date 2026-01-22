import { defineProvider } from './provider';
import { createMcpService } from '../services/mcp';

export default defineProvider({
  init(strapi) {
    strapi.add('mcp', () => createMcpService(strapi));
  },
  async bootstrap(strapi) {
    if (strapi.get('mcp').isEnabled()) {
      try {
        strapi.log.info('[MCP] Starting MCP server...');
        await strapi.get('mcp').start();
      } catch (error) {
        strapi.log.error('[MCP] Failed to start MCP server', { error });
      }
    } else {
      strapi.log.debug('[MCP] MCP server is disabled in configuration');
    }
  },
  async destroy(strapi) {
    if (strapi.get('mcp').isRunning()) {
      try {
        strapi.log.info('[MCP] Stopping MCP server...');
        await strapi.get('mcp').stop();
      } catch (error) {
        strapi.log.error('[MCP] Failed to stop MCP server', { error });
      }
    }
  },
});
