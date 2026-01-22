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

    // Security: Sanitize message to prevent log injection
    // 1. Limit length to prevent log spam (10KB max)
    const MAX_MESSAGE_LENGTH = 10 * 1024;
    let sanitizedMessage =
      message.length > MAX_MESSAGE_LENGTH
        ? `${message.substring(0, MAX_MESSAGE_LENGTH)}...[truncated]`
        : message;

    // 2. Remove control characters (including ANSI escape codes)
    // This regex matches: \x00-\x1F (C0 controls), \x7F (DEL), \x80-\x9F (C1 controls)
    // and ANSI escape sequences (\x1B[ followed by parameters and command)
    sanitizedMessage = sanitizedMessage
      // eslint-disable-next-line no-control-regex
      .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '') // Remove ANSI escape sequences
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters

    // 3. Replace newlines with spaces to prevent fake log entry injection
    sanitizedMessage = sanitizedMessage.replace(/[\r\n]+/g, ' ');

    // 4. Trim whitespace
    sanitizedMessage = sanitizedMessage.trim();

    // Map level to appropriate logger method
    switch (level) {
      case 'http':
        strapi.log.http(`[MCP] ${sanitizedMessage}`);
        break;
      case 'warn':
        strapi.log.warn(`[MCP] ${sanitizedMessage}`);
        break;
      case 'error':
        strapi.log.error(`[MCP] ${sanitizedMessage}`);
        break;
      case 'log':
        strapi.log.info(`[MCP] ${sanitizedMessage}`);
        break;
      case 'info':
      default:
        strapi.log.info(`[MCP] ${sanitizedMessage}`);
        break;
    }

    const result = {
      status: 'logged',
      message: sanitizedMessage,
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
