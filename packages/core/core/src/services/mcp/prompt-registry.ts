// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredPrompt } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import * as z from 'zod';
import { McpCapabilityDefinitions } from './internal/McpCapabilityDefinitions';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';

export const makeMcpPromptDefinition = <
  Name extends string,
  Title extends string,
  Description extends string,
  ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
>(
  prompt: Modules.MCP.McpPromptDefinition<Name, ArgsSchema, Title, Description>
): Modules.MCP.McpPromptDefinition<Name, ArgsSchema, Title, Description> => prompt;

export class McpPromptRegistry
  extends McpCapabilityRegistryBase<'prompt', Modules.MCP.McpPromptDefinition, RegisteredPrompt>
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitions<'prompt', Modules.MCP.McpPromptDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    super.register((definition) => {
      const { name, title, description, argsSchema, createHandler } = definition;

      return mcpServer.registerPrompt(
        name,
        {
          title,
          description,
          // @ts-expect-error - Internal handler type mismatch due to optional argsSchema
          argsSchema,
        },
        // @ts-expect-error - Internal handler type mismatch due to optional argsSchema
        async (args) => createHandler(this.#strapi)(args as any)
      );
    });
  }
}
