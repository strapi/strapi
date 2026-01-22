// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import * as z from 'zod';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';

export const makeMcpToolDefinition = <
  Name extends string,
  Title extends string,
  Description extends string,
  OutputSchema extends z.ZodObject<z.ZodRawShape>,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(tool: {
  name: Name;
  title: Title;
  description: Description;
  inputSchema?: InputSchema;
  outputSchema: OutputSchema;
  devModeOnly: boolean;
  createHandler: (strapi: Core.Strapi) => Modules.MCP.McpToolCallback<InputSchema, OutputSchema>;
}): Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description> =>
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

      return createSafeCapabilityRegistration({
        strapi: this.#strapi,
        capabilityType: 'Tool',
        name,
        createHandler,
        createFallbackHandler(errorMessage) {
          return async () => ({
            content: [
              {
                type: 'text' as const,
                text: `Tool "${name}" failed to initialize: ${errorMessage}`,
              },
            ],
            structuredContent: {
              dope: true,
            },
            isError: true,
          });
        },
        createErrorResult(error) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Tool "${name}" execution failed: ${error.message}`,
              },
            ],
            structuredContent: {},
            isError: true,
          };
        },
        registerWithSdk(safeHandler) {
          return mcpServer.registerTool(
            name,
            { title, description, inputSchema, outputSchema },
            // @ts-expect-error - Internal handler type mismatch due to optional inputSchema
            safeHandler
          );
        },
      });
    });
  }
}
