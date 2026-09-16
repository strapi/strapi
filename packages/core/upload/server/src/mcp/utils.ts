import type { Modules } from '@strapi/types';

/** Wraps a plain object into the dual-representation MCP tool return value (text + structuredContent). */
export const ok = (
  structuredContent: Record<string, unknown>
): Modules.MCP.McpToolHandlerReturn => ({
  content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
  structuredContent,
});
