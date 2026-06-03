// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredPrompt } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';

import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';

export const makeMcpPromptDefinition = <Definition extends Modules.MCP.McpPromptDefinition>(
  prompt: Definition
): Definition => prompt;

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
    const strapi = this.#strapi;

    super.register((definition) => {
      const { name, title, description, argsSchema, createHandler } = definition;

      return createSafeCapabilityRegistration({
        strapi,
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
          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'prompt',
            name,
            definition.telemetry,
            safeHandler
          );

          return mcpServer.registerPrompt(
            name,
            {
              title,
              description,
              // @ts-expect-error - Internal handler type mismatch due to optional argsSchema
              argsSchema,
            },
            sdkHandler
          );
        },
      });
    });
  }
}
