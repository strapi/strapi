import type { Modules, Core } from '@strapi/types';
import type { z } from '@strapi/utils';

/**
 * Shape of an upload MCP tool definition.
 *
 * Mirrors `Modules.MCP.McpToolDefinitionFields` but pins the schema generics to the erased
 * `z.ZodObject<z.ZodRawShape>` so a heterogeneous array of tools stays assignable without a cast.
 * `resolveInputSchema` is optional: `list_folders` takes no arguments.
 */
export type UploadMcpTool = {
  name: string;
  telemetry: { source: 'upload'; name: string };
  title: string;
  description: string;
  auth: Modules.MCP.McpCapabilityAuth;
  resolveInputSchema?: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  resolveOutputSchema: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  createHandler: (
    strapi: Core.Strapi,
    context: Modules.MCP.McpHandlerContext
  ) => Modules.MCP.McpToolHandler<z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>>;
};
