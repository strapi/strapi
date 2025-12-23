import * as z from 'zod';

import { makeMcpToolDefinition } from '../tool-registry';

export const logToolDefinition = makeMcpToolDefinition({
  name: 'log',
  title: 'Strapi Log',
  description: 'Logs a message to the Strapi logger with specified level',
  inputSchema: z.object({
    message: z.string().describe('Message to log'),
    level: z
      .enum(['info', 'http', 'warn', 'error', 'log'])
      .optional()
      .describe('Log level (default: info)'),
  }),
  outputSchema: z.object({
    status: z.string(),
    message: z.string(),
    level: z.string(),
    timestamp: z.string(),
  }),
  devModeOnly: true,
  createHandler: (strapi) => async (params) => {
    const { message, level = 'info' } = params;

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

    const result = {
      status: 'logged',
      message,
      level,
      timestamp: new Date().toISOString(),
    };
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    };
  },
});
