import type { McpServer, RegisteredTool, ServerContext } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import type { McpAdminTokenAbility } from './authentication';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import type { McpToolRegistrationPlan } from './internal/classify-mcp-tool-registration';
import { canUseMcpCapability } from './internal/syncMcpSessionCapabilities';
import {
  MCP_TOOL_JSON_SCHEMA_TARGET,
  cachedJsonSchemaStandardSchema,
  mcpToolSchemaCache,
  mcpToolSchemaCacheKey,
  readMcpToolSchemaProjection,
  type McpToolJsonSchemas,
} from './internal/tool-schema-cache';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';
import {
  FAILED_REGISTERED_CAPABILITY,
  createSafeCapabilityRegistration,
} from './utils/createSafeCapabilityRegistration';
import { createMcpCapabilityHandlerContext } from './utils/createMcpCapabilityHandlerContext';
import { toSdkToolResult } from './utils/toSdkMcpCapabilityResult';

/**
 * Defines a Strapi MCP tool with full type inference, ready to pass to
 * `strapi.ai.mcp.registerTool()`. Exposed publicly as `ai.mcp.defineTool`.
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
 * import { ai } from '@strapi/strapi';
 * import { z } from '@strapi/utils';
 *
 * const greet = ai.mcp.defineTool({
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

  /**
   * `all` registers every definition with a live Zod schema, then session sync
   * enables or disables it. Request plans register only the tools that POST
   * needs, and only after the coarse allowlist passes. An unauthorized
   * `tools/call` is therefore absent ("tool not found") rather than disabled.
   */
  async bind(
    mcpServer: McpServer,
    options: { plan: McpToolRegistrationPlan; isDevMode: boolean } = {
      plan: { mode: 'all' },
      isDevMode: false,
    }
  ) {
    const { plan, isDevMode } = options;
    if (plan.mode === 'none') {
      return;
    }

    if (plan.mode === 'all') {
      super.register((definition) => this.#registerLive(mcpServer, definition));
      return;
    }

    for (const definition of this.definitions()) {
      if (plan.mode === 'call' && plan.names.has(definition.name) === false) {
        continue;
      }

      const allowed = canUseMcpCapability({
        ability: this.#ability,
        definition,
        isDevMode,
      });
      if (allowed === false) {
        continue;
      }

      const registered =
        plan.mode === 'list'
          ? await this.#registerListed(mcpServer, definition)
          : this.#registerLive(mcpServer, definition);
      this.storeRegistered(definition.name, registered);
    }
  }

  #handlerContext(): Modules.MCP.McpHandlerContext {
    return {
      userAbility: this.#ability,
      user: this.#user,
    };
  }

  #registerLive(mcpServer: McpServer, definition: Modules.MCP.McpToolDefinition): RegisteredTool {
    const strapi = this.#strapi;
    const context = this.#handlerContext();
    const { name, title, description, resolveInputSchema, resolveOutputSchema, createHandler } =
      definition;

    return createSafeCapabilityRegistration({
      strapi,
      capabilityType: 'Tool',
      name,
      createHandler: (boundStrapi: Core.Strapi) => createHandler(boundStrapi, context),
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

        if (inputSchema !== undefined) {
          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'tool',
            name,
            definition.telemetry,
            async (args: unknown, extra: ServerContext) =>
              toSdkToolResult(
                await safeHandler({
                  args,
                  extra: createMcpCapabilityHandlerContext(extra),
                } as Parameters<typeof safeHandler>[0])
              )
          );

          return mcpServer.registerTool(
            name,
            { title, description, inputSchema, outputSchema },
            sdkHandler
          );
        }

        const sdkHandler = wrapCapabilityHandlerForMetrics(
          strapi,
          'tool',
          name,
          definition.telemetry,
          async (extra: ServerContext) =>
            toSdkToolResult(
              await safeHandler({
                extra: createMcpCapabilityHandlerContext(extra),
              } as Parameters<typeof safeHandler>[0])
            )
        );

        return mcpServer.registerTool(name, { title, description, outputSchema }, sdkHandler);
      },
    });
  }

  async #registerListed(
    mcpServer: McpServer,
    definition: Modules.MCP.McpToolDefinition
  ): Promise<RegisteredTool> {
    const strapi = this.#strapi;
    const context = this.#handlerContext();
    const { name, title, description, resolveInputSchema, resolveOutputSchema, createHandler } =
      definition;

    let schemas: McpToolJsonSchemas;
    try {
      const key = mcpToolSchemaCacheKey(name, readMcpToolSchemaProjection(definition, context));
      schemas = await mcpToolSchemaCache.getOrBuild(key, () => {
        const inputSchema =
          resolveInputSchema !== undefined ? resolveInputSchema(context) : undefined;
        const outputSchema = resolveOutputSchema(context);
        return {
          input:
            inputSchema === undefined
              ? undefined
              : (z.toJSONSchema(inputSchema, {
                  target: MCP_TOOL_JSON_SCHEMA_TARGET,
                  io: 'input',
                }) as Record<string, unknown>),
          output: z.toJSONSchema(outputSchema, {
            target: MCP_TOOL_JSON_SCHEMA_TARGET,
            io: 'output',
          }) as Record<string, unknown>,
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.error(`[MCP] Failed to register tool "${name}" with MCP server: ${message}`);
      return FAILED_REGISTERED_CAPABILITY as unknown as RegisteredTool;
    }

    return createSafeCapabilityRegistration({
      strapi,
      capabilityType: 'Tool',
      name,
      createHandler: (boundStrapi: Core.Strapi) => createHandler(boundStrapi, context),
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
        const outputSchema = cachedJsonSchemaStandardSchema(schemas.output);

        if (schemas.input !== undefined) {
          const inputSchema = cachedJsonSchemaStandardSchema(schemas.input);
          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'tool',
            name,
            definition.telemetry,
            async (args: unknown, extra: ServerContext) =>
              toSdkToolResult(
                await safeHandler({
                  args,
                  extra: createMcpCapabilityHandlerContext(extra),
                } as Parameters<typeof safeHandler>[0])
              )
          );

          return mcpServer.registerTool(
            name,
            { title, description, inputSchema, outputSchema },
            sdkHandler
          );
        }

        const sdkHandler = wrapCapabilityHandlerForMetrics(
          strapi,
          'tool',
          name,
          definition.telemetry,
          async (extra: ServerContext) =>
            toSdkToolResult(
              await safeHandler({
                extra: createMcpCapabilityHandlerContext(extra),
              } as Parameters<typeof safeHandler>[0])
            )
        );

        return mcpServer.registerTool(name, { title, description, outputSchema }, sdkHandler);
      },
    });
  }
}
