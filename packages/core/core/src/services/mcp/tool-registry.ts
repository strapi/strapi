// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import type { McpAdminTokenAbility } from './authentication';

/**
 * Defines a Strapi MCP tool with full type inference, ready to pass to
 * `strapi.ai.mcp.registerTool()`. Exposed publicly as `mcp.defineTool`.
 *
 * The returned value is the definition unchanged — this builder only exists to
 * infer the `name`, input/output schemas and handler types, and to narrow the
 * access variant (`devModeOnly` vs `auth`) so the result is directly assignable
 * to `registerTool`.
 *
 * @param tool - The tool definition. Provide either `devModeOnly: true` (dev-only,
 * no auth) or an `auth` policy set — never both.
 * @returns The same definition, with its access variant narrowed.
 *
 * @example
 * ```ts
 * import { mcp } from '@strapi/strapi';
 * import { z } from '@strapi/utils';
 *
 * const greet = mcp.defineTool({
 *   name: 'greet',
 *   title: 'Greet',
 *   description: 'Greets a user by name',
 *   devModeOnly: true,
 *   resolveInputSchema: () => z.object({ name: z.string() }),
 *   resolveOutputSchema: () => z.object({ message: z.string() }),
 *   createHandler: (strapi) => async ({ args }) => {
 *     const message = `Hello, ${args.name}!`;
 *     return { content: [{ type: 'text', text: message }], structuredContent: { message } };
 *   },
 * });
 *
 * // later, in register() or bootstrap():
 * strapi.ai.mcp.registerTool(greet);
 * ```
 */
export const makeMcpToolDefinition = ((definition: Modules.MCP.McpToolDefinition) =>
  definition) as unknown as Modules.MCP.McpToolBuilder;

export class McpToolRegistry
  extends McpCapabilityRegistryBase<'tool', Modules.MCP.McpToolDefinition, RegisteredTool>
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  #ability: McpAdminTokenAbility;

  #user: Modules.MCP.McpHandlerContext['user'];

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
    ability: McpAdminTokenAbility;
    user: Modules.MCP.McpHandlerContext['user'];
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
    this.#ability = ctx.ability;
    this.#user = ctx.user;
  }

  bind(mcpServer: McpServer) {
    const strapi = this.#strapi;

    super.register((definition) => {
      const { name, title, description, resolveInputSchema, resolveOutputSchema, createHandler } =
        definition;

      // Bind the session ability and token owner into the handler context so handlers can enforce
      // field-level and entity-level permission checks and set creator fields.
      const context: Modules.MCP.McpHandlerContext = {
        userAbility: this.#ability,
        user: this.#user,
      };
      const createHandlerWithContext = (strapi: Core.Strapi) => createHandler(strapi, context);

      return createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Tool',
        name,
        createHandler: createHandlerWithContext,
        createFallbackHandler(errorMessage) {
          return async () => ({
            content: [
              {
                type: 'text' as const,
                text: `Tool "${name}" failed to initialize: ${errorMessage}`,
              },
            ],
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
            isError: true,
          };
        },
        registerWithSdk(safeHandler) {
          const inputSchema =
            resolveInputSchema !== undefined ? resolveInputSchema(context) : undefined;
          const outputSchema = resolveOutputSchema(context);

          // Adapt from our object-literal handler `({ args, extra })` to
          // the MCP SDK's positional form `(args, extra)` / `(extra)`.
          const baseHandler =
            inputSchema !== undefined
              ? (args: unknown, extra: unknown) =>
                  safeHandler({ args, extra } as Parameters<typeof safeHandler>[0])
              : (extra: unknown) => safeHandler({ extra } as Parameters<typeof safeHandler>[0]);

          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'tool',
            name,
            definition.telemetry,
            baseHandler
          );

          return mcpServer.registerTool(
            name,
            { title, description, inputSchema, outputSchema },
            sdkHandler
          );
        },
      });
    });
  }
}
