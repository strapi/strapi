import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createLogSuccessTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'log_success',
    description: 'Logs a success message to the Strapi logger',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional success message to log',
        },
      },
      required: [],
    },
  };

  const handler = async (params: { message?: string } = {}): Promise<any> => {
    const message = params.message || 'success';
    strapi.log.info(`[MCP] ${message}`);
    return {
      status: 'success',
      message,
      timestamp: new Date().toISOString(),
      flavor: 'pineapple',
    };
  };

  return { tool, handler };
};
