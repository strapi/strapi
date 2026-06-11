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

/**
 * Defines a Strapi MCP prompt with full type inference, ready to pass to
 * `strapi.ai.mcp.registerPrompt()`. Exposed publicly as `mcp.definePrompt`.
 *
 * The returned value is the definition unchanged — this builder only exists to
 * infer the `name`/`argsSchema` and narrow the access variant (`devModeOnly` vs
 * `auth`) so the result is directly assignable to `registerPrompt`.
 *
 * @param prompt - The prompt definition. Provide either `devModeOnly: true`
 * (dev-only, no auth) or an `auth` policy set — never both.
 * @returns The same definition, with its access variant narrowed.
 *
 * @example
 * ```ts
 * import { mcp } from '@strapi/strapi';
 *
 * const context = mcp.definePrompt({
 *   name: 'app-context',
 *   title: 'App Context',
 *   description: 'Provides context about the app',
 *   devModeOnly: true,
 *   createHandler: (strapi) => async () => ({
 *     messages: [{ role: 'user', content: { type: 'text', text: 'You are connected to Strapi.' } }],
 *   }),
 * });
 *
 * // later, in register() or bootstrap():
 * strapi.ai.mcp.registerPrompt(context);
 * ```
 */
export const makeMcpPromptDefinition = ((definition: Modules.MCP.McpPromptDefinition) =>
  definition) as unknown as Modules.MCP.McpPromptBuilder;

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
