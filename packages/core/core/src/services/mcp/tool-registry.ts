import type { McpServer, RegisteredTool, ServerContext } from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';
import { assertSchemaConvertsToJsonSchema } from './utils/assertSchemaConvertsToJsonSchema';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import { isStandardSchema, toListedSchema } from './utils/toListedSchema';
import { createMcpCapabilityHandlerContext } from './utils/createMcpCapabilityHandlerContext';
import { toSdkToolResult } from './utils/toSdkMcpCapabilityResult';
import type { McpAdminTokenAbility } from './authentication';

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

  #shouldResolveSchemas: (definition: Modules.MCP.McpToolDefinition) => boolean;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitionRegistry<'tool', Modules.MCP.McpToolDefinition>;
    ability: McpAdminTokenAbility;
    user: Modules.MCP.McpHandlerContext['user'];
    /**
     * Whether the current request needs this tool's schemas. Resolving them is the dominant
     * per-request cost, so tools the request never lists nor calls skip it. Defaults to every tool.
     */
    shouldResolveSchemas?: (definition: Modules.MCP.McpToolDefinition) => boolean;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
    this.#ability = ctx.ability;
    this.#user = ctx.user;
    this.#shouldResolveSchemas = ctx.shouldResolveSchemas ?? (() => true);
  }

  bind(mcpServer: McpServer) {
    const strapi = this.#strapi;

    super.register((definition) => {
      const { name, title, description, resolveInputSchema, resolveOutputSchema, createHandler } =
        definition;

      if (this.#shouldResolveSchemas(definition) === false) {
        // Keep the tool known to the SDK so a call answers `Tool <name> disabled` (no permission)
        // rather than `not found`. The request never lists nor runs it, so no schema is needed.
        const unavailableResult = {
          content: [
            {
              type: 'text' as const,
              text: `Tool "${name}" is not available in this request`,
            },
          ],
          isError: true,
        };

        return createSafeCapabilityRegistration({
          strapi,
          capabilityType: 'Tool',
          name,
          createHandler: () => async () => unavailableResult,
          createFallbackHandler: () => async () => unavailableResult,
          createErrorResult: () => unavailableResult,
          registerWithSdk: (safeHandler) =>
            mcpServer.registerTool(name, { title, description }, safeHandler),
        });
      }

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
        reportRegistrationError: (message) =>
          reportToolRegistrationError(strapi, definition, message),
        registerWithSdk(safeHandler) {
          const inputSchema = toListedSchema(
            resolveInputSchema !== undefined ? resolveInputSchema(context) : undefined
          );
          const outputSchema = toListedSchema(resolveOutputSchema(context));

          // The SDK accepts any schema at registration and only converts it while serving
          // tools/list, where one failure fails the whole list. Probe both schemas first so an
          // unconvertible one fails this registration alone and never reaches the SDK.
          probeToolSchema('inputSchema', inputSchema, 'input');
          probeToolSchema('outputSchema', outputSchema, 'output');

          if (inputSchema !== undefined) {
            // Adapt from Strapi's object parameter to the SDK's positional callback.
            const sdkHandler = wrapCapabilityHandlerForMetrics(
              strapi,
              'tool',
              name,
              definition.telemetry,
              async (args: unknown, context: ServerContext) =>
                toSdkToolResult(
                  await safeHandler({
                    args,
                    extra: createMcpCapabilityHandlerContext(context),
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
            async (context: ServerContext) =>
              toSdkToolResult(
                await safeHandler({
                  extra: createMcpCapabilityHandlerContext(context),
                } as Parameters<typeof safeHandler>[0])
              )
          );

          return mcpServer.registerTool(name, { title, description, outputSchema }, sdkHandler);
        },
      });
    });
  }
}

const probeToolSchema = (field: string, schema: unknown, io: 'input' | 'output') => {
  if (!isStandardSchema(schema)) {
    return;
  }

  try {
    assertSchemaConvertsToJsonSchema(schema, io);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${field} cannot be converted to JSON Schema: ${reason}`);
  }
};

/**
 * Failures already logged per tool definition. A new MCP server, and so a new registration, is
 * built for every request, so a broken schema would otherwise log on every request. Schemas are
 * resolved per request and can differ per token, so each distinct failure is logged once.
 */
const reportedToolRegistrationErrors = new WeakMap<Modules.MCP.McpToolDefinition, Set<string>>();

const reportToolRegistrationError = (
  strapi: Core.Strapi,
  definition: Modules.MCP.McpToolDefinition,
  message: string
) => {
  let reported = reportedToolRegistrationErrors.get(definition);
  if (reported === undefined) {
    reported = new Set();
    reportedToolRegistrationErrors.set(definition, reported);
  }

  if (reported.has(message)) {
    return;
  }

  reported.add(message);
  strapi.log.error(
    `[MCP] Failed to register tool "${definition.name}" with MCP server: ${message}`
  );
};
