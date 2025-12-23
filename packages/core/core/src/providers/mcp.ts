import { defineProvider } from './provider';
import { createMcpService } from '../services/mcp';

export default defineProvider({
  init(strapi) {
    strapi.add('mcp', () => createMcpService(strapi));
  },
  async bootstrap(strapi) {
    if (strapi.get('mcp').isEnabled()) {
      strapi.log.info('[MCP] Starting MCP server...');
      await strapi.get('mcp').start();
    } else {
      strapi.log.debug('[MCP] MCP server is disabled in configuration');
    }
  },
  async destroy(strapi) {
    if (strapi.get('mcp').isRunning()) {
      strapi.log.info('[MCP] Stopping MCP server...');
      await strapi.get('mcp').stop();
    }
  },
});
