import type {
  McpServer,
  RegisteredPrompt,
  ServerContext,
  StandardSchemaWithJSON,
} from '@modelcontextprotocol/server';
import type { Core, Modules } from '@strapi/types';
import { z } from '@strapi/utils';

import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { assertSchemaConvertsToJsonSchema } from './utils/assertSchemaConvertsToJsonSchema';
import {
  createSafeCapabilityRegistration,
  FAILED_REGISTERED_CAPABILITY,
} from './utils/createSafeCapabilityRegistration';
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

      // The first request logged the rejection; later requests only keep the prompt out.
      if (hasRejectedArgsSchema(definition)) {
        return FAILED_REGISTERED_CAPABILITY as RegisteredPrompt;
      }

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
            { title, description, argsSchema: probeArgsSchema(definition) },
            (args, context) => sdkHandler(args, createMcpCapabilityHandlerContext(context))
          );
        },
      });
    });
  }
}

type ArgsSchemaProbe = { ok: true; schema: unknown } | { ok: false; message: string };

/**
 * One probe per prompt definition and per process. `argsSchema` is static for a definition, while
 * a new MCP server (and so a new registration) is built for every request.
 */
const argsSchemaProbes = new WeakMap<Modules.MCP.McpPromptDefinition, ArgsSchemaProbe>();

const ARGS_SCHEMA_HINT =
  'Prompt arguments arrive as strings: declare argsSchema as z.object() with z.string() fields (z.iso.date() for a date, not z.date() or z.coerce.date()).';

/**
 * Returns the `argsSchema` to register, or throws when the SDK could not list it.
 *
 * The SDK accepts any schema at registration and only converts it while serving prompts/list,
 * where one failure hides every prompt. Probing before `registerPrompt` makes an unconvertible
 * schema fail this registration alone, and keeps the rejected prompt out of the SDK state (its
 * completion handler and the `completions` capability, which `remove()` does not undo).
 */
const probeArgsSchema = (definition: Modules.MCP.McpPromptDefinition) => {
  let probe = argsSchemaProbes.get(definition);

  if (probe === undefined) {
    probe = runArgsSchemaProbe(definition.argsSchema);
    argsSchemaProbes.set(definition, probe);
  }

  if (!probe.ok) {
    throw new Error(probe.message);
  }

  return probe.schema as Modules.MCP.McpPromptDefinition['argsSchema'];
};

/** Whether an earlier request already rejected (and logged) this definition's `argsSchema`. */
const hasRejectedArgsSchema = (definition: Modules.MCP.McpPromptDefinition) =>
  argsSchemaProbes.get(definition)?.ok === false;

const runArgsSchemaProbe = (argsSchema: unknown): ArgsSchemaProbe => {
  // The SDK wraps a raw Zod shape with z.object() at registration and lists the wrapped schema.
  // Wrap it here so the probe converts the same schema and the SDK receives it as is.
  const schema = isRawZodShape(argsSchema) ? z.object(argsSchema) : argsSchema;

  // Anything else that is not a Standard Schema is rejected by registerPrompt itself.
  if (!isStandardSchema(schema)) {
    return { ok: true, schema };
  }

  try {
    assertSchemaConvertsToJsonSchema(schema, 'input');
    return { ok: true, schema };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `argsSchema cannot be converted to JSON Schema: ${reason}. ${ARGS_SCHEMA_HINT}`,
    };
  }
};

// Same checks as the SDK's `isStandardSchema` and `isZodRawShape` (@modelcontextprotocol/server@2.3.1).
const isStandardSchema = (value: unknown): value is StandardSchemaWithJSON =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  '~standard' in value &&
  typeof (value as { '~standard'?: { validate?: unknown } })['~standard']?.validate === 'function';

const isRawZodShape = (value: unknown): value is z.ZodRawShape => {
  if (typeof value !== 'object' || value === null || isStandardSchema(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return Object.values(value).every(
    (field) => typeof field === 'object' && field !== null && '_zod' in field
  );
};
