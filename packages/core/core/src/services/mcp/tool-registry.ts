import type { Core } from '@strapi/types';
import type { MCPTool, MCPToolHandler } from './types';
import {
  createLogTool,
  createListContentTypesTool,
  createListRoutesTool,
  createRBACApiTokensTool,
  createRBACAdminRolesTool,
  createRoleEditorTool,
} from './tools';

export class MCPToolRegistry {
  private tools: Map<string, MCPToolHandler> = new Map();

  constructor(strapi: Core.Strapi) {
    this.registerTools(strapi);
  }

  private registerTools(strapi: Core.Strapi) {
    const toolCreators = [
      createLogTool,
      createListContentTypesTool,
      createListRoutesTool,
      createRBACApiTokensTool,
      createRBACAdminRolesTool,
      createRoleEditorTool,
    ];
    toolCreators.forEach((createTool) => {
      const { tool, handler } = createTool(strapi);
      this.tools.set(tool.name, { tool, handler });
    });
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values()).map(({ tool }) => tool);
  }

  getHandler(toolName: string): ((params?: any) => Promise<any>) | null {
    const toolHandler = this.tools.get(toolName);
    return toolHandler ? toolHandler.handler : null;
  }

  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }
}
