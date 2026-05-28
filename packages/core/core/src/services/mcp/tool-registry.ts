// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import type { McpAdminTokenAbility } from './authentication';

export function makeMcpToolDefinition<
  Name extends string,
  Title extends string,
  Description extends string,
  OutputSchema extends z.ZodObject<z.ZodRawShape>,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  Access extends Modules.MCP.McpCapabilityAccess = Modules.MCP.McpCapabilityAccess,
>(
  tool: {
    name: Name;
    title: Title;
    description: Description;
    resolveInputSchema?: (context: Modules.MCP.McpHandlerContext) => InputSchema;
    resolveOutputSchema: (context: Modules.MCP.McpHandlerContext) => OutputSchema;
    createHandler: (
      strapi: Core.Strapi,
      context: Modules.MCP.McpHandlerContext
    ) => Modules.MCP.McpToolHandler<NoInfer<InputSchema>, NoInfer<OutputSchema>>;
  } & Access
): Modules.MCP.McpToolDefinition<Name, InputSchema, OutputSchema, Title, Description> & Access {
  return tool as Modules.MCP.McpToolDefinition<
    Name,
    InputSchema,
    OutputSchema,
    Title,
    Description
  > &
    Access;
}

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
        strapi: this.#strapi,
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
          const sdkHandler =
            inputSchema !== undefined
              ? (args: unknown, extra: unknown) =>
                  safeHandler({ args, extra } as Parameters<typeof safeHandler>[0])
              : (extra: unknown) => safeHandler({ extra } as Parameters<typeof safeHandler>[0]);

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
