// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { Core, Modules, Utils } from '@strapi/types';
import * as z from 'zod';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';

export const makeMcpToolDefinition = <
  Name extends string,
  Title extends string,
  Description extends string,
  OutputSchema extends z.ZodObject<z.ZodRawShape>,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(
  tool: {
    name: Name;
    title: Title;
    description: Description;
    inputSchema?: InputSchema;
    outputSchema: OutputSchema;
    annotations?: ToolAnnotations;
    createHandler: (strapi: Core.Strapi) => Modules.MCP.McpToolCallback<InputSchema, OutputSchema>;
  } & Utils.XOR<{ devModeOnly: true }, { auth: { actions: string[]; subject?: string } }>
): Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description> =>
  tool as Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description>;

export class McpToolRegistry
  extends McpCapabilityRegistryBase<'tool', Modules.MCP.McpToolDefinition, RegisteredTool>
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    super.register((definition) => {
      const { name, title, description, inputSchema, outputSchema, createHandler } = definition;
      // annotations is defined in source types but may not be in compiled types yet
      const annotations = (definition as { annotations?: ToolAnnotations }).annotations;

      return mcpServer.registerTool(
        name,
        {
          title,
          description,
          inputSchema,
          outputSchema,
          annotations,
        },
        createHandler(this.#strapi) as any // Internal handler type mismatch due to optional inputSchema
      );
    });
  }
}
