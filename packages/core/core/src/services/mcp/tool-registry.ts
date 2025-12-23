// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import * as z from 'zod';
import { McpCapabilityDefinitions } from './internal/McpCapabilityDefinitions';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';

export const makeMcpToolDefinition = <
  Name extends string,
  Title extends string,
  Description extends string,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape>,
>(
  tool: Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description>
): Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description> => tool;

export class McpToolRegistry
  extends McpCapabilityRegistryBase<'tool', Modules.MCP.McpToolDefinition, RegisteredTool>
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitions<'tool', Modules.MCP.McpToolDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    super.register((definition) => {
      const { name, title, description, inputSchema, outputSchema, createHandler } = definition;

      return mcpServer.registerTool(
        name,
        {
          title,
          description,
          inputSchema,
          outputSchema,
        },
        // @ts-expect-error - Internal handler type mismatch due to optional inputSchema
        createHandler(this.#strapi)
      );
    });
  }
}
