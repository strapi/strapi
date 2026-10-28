import type { McpServer, RegisteredPrompt, ServerContext } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';

import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';
import { createMcpCapabilityHandlerContext } from './utils/createMcpCapabilityHandlerContext';
import { toSdkPromptResult } from './utils/toSdkMcpCapabilityResult';

/**
 * Defines a Strapi MCP prompt with full type inference, ready to pass to
 * `strapi.ai.mcp.registerPrompt()`. Exposed publicly as `ai.mcp.definePrompt`.
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
 * import { ai } from '@strapi/strapi';
 *
 * const context = ai.mcp.definePrompt({
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
          if (argsSchema === undefined) {
            const handler = safeHandler as unknown as Modules.MCP.McpPromptCallback<undefined>;
            const sdkHandler = wrapCapabilityHandlerForMetrics(
              strapi,
              'prompt',
              name,
              definition.telemetry,
              async (context: Modules.MCP.McpCapabilityHandlerContext) =>
                toSdkPromptResult(await handler(context))
            );

            return mcpServer.registerPrompt(
              name,
              { title, description },
              (argsOrContext: unknown, context?: ServerContext) => {
                // The SDK types omit the no-schema callback overload, but the runtime passes only
                // ServerContext when argsSchema is absent.
                const sdkContext = context ?? (argsOrContext as ServerContext);
                return sdkHandler(createMcpCapabilityHandlerContext(sdkContext));
              }
            );
          }

          const handler = safeHandler as unknown as Modules.MCP.McpPromptCallback<
            typeof argsSchema
          >;
          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'prompt',
            name,
            definition.telemetry,
            async (
              args: Parameters<typeof handler>[0],
              context: Modules.MCP.McpCapabilityHandlerContext
            ) => toSdkPromptResult(await handler(args, context))
          );

          return mcpServer.registerPrompt(
            name,
            { title, description, argsSchema },
            (args, context) => sdkHandler(args, createMcpCapabilityHandlerContext(context))
          );
        },
      });
    });
  }
}
