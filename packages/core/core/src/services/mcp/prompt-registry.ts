// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredPrompt } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import * as z from 'zod';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';

export const makeMcpPromptDefinition = <
  Name extends string,
  Title extends string,
  Description extends string,
  ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
>(prompt: {
  name: Name;
  title: Title;
  description: Description;
  argsSchema?: ArgsSchema;
  devModeOnly: boolean;
  createHandler: (strapi: Core.Strapi) => Modules.MCP.McpPromptCallback<ArgsSchema>;
}): Modules.MCP.McpPromptDefinition<Name, ArgsSchema, Title, Description> =>
  prompt as Modules.MCP.McpPromptDefinition<Name, ArgsSchema, Title, Description>;

export class McpPromptRegistry
  extends McpCapabilityRegistryBase<'prompt', Modules.MCP.McpPromptDefinition, RegisteredPrompt>
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitionRegistry<'prompt', Modules.MCP.McpPromptDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    super.register((definition) => {
      const { name, title, description, argsSchema, createHandler } = definition;

      return createSafeCapabilityRegistration({
        strapi: this.#strapi,
        capabilityType: 'Prompt',
        name,
        createHandler,
        createFallbackHandler(errorMessage) {
          return async () => ({
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Prompt "${name}" failed to initialize: ${errorMessage}`,
                },
              },
            ],
          });
        },
        createErrorResult(error) {
          return {
            messages: [
              {
                role: 'user' as const,
                content: {
                  type: 'text' as const,
                  text: `Prompt "${name}" execution failed: ${error.message}`,
                },
              },
            ],
          };
        },
        registerWithSdk(safeHandler) {
          return mcpServer.registerPrompt(
            name,
            {
              title,
              description,
              // @ts-expect-error - Internal handler type mismatch due to optional argsSchema
              argsSchema,
            },
            safeHandler
          );
        },
      });
    });
  }
}
