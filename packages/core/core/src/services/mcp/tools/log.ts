import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createLogTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'log',
    description: 'Logs a message to the Strapi logger with specified level',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to log',
        },
        level: {
          type: 'string',
          enum: ['info', 'http', 'warn', 'error', 'log'],
          description: 'Log level (default: info)',
        },
      },
      required: ['message'],
    },
  };

  const handler = async (params: { message?: string; level?: string } = {}): Promise<any> => {
    const { message, level = 'info' } = params;

    if (!message) {
      return { error: 'Message parameter is required' };
    }

    // Map level to appropriate logger method
    switch (level) {
      case 'http':
        strapi.log.http(`[MCP] ${message}`);
        break;
      case 'warn':
        strapi.log.warn(`[MCP] ${message}`);
        break;
      case 'error':
        strapi.log.error(`[MCP] ${message}`);
        break;
      case 'log':
        strapi.log.info(`[MCP] ${message}`);
        break;
      case 'info':
      default:
        strapi.log.info(`[MCP] ${message}`);
        break;
    }

    return {
      status: 'logged',
      message,
      level,
      timestamp: new Date().toISOString(),
    };
  };

  return { tool, handler };
};
