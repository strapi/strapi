// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Core } from '@strapi/types';
import { z } from '@strapi/utils';

/**
 * JSON Schema dialect that MCP SEP-1613 establishes as the default for embedded schemas.
 */
export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

export type JsonSchemaIo = 'input' | 'output';

type JsonSchemaDocument = Record<string, unknown>;

type ListToolsResult = {
  tools: Array<{ name: string; inputSchema?: unknown; outputSchema?: unknown }>;
};

type RequestHandler = (request: unknown, extra: unknown) => Promise<unknown>;

/**
 * Converts a Zod v4 schema to JSON Schema 2020-12.
 *
 * This is deliberately the same call the MCP SDK makes for Zod v4 schemas in its `tools/list`
 * handler — `toJSONSchema(schema, { target, io })` — with the `target` the SDK currently omits
 * (modelcontextprotocol/typescript-sdk#2084). Keeping the call identical means the documents we
 * advertise match what the SDK will emit once the upstream fix ships.
 */
export const toJsonSchema2020 = (schema: unknown, io: JsonSchemaIo): JsonSchemaDocument =>
  z.toJSONSchema(schema as z.ZodType, { target: 'draft-2020-12', io }) as JsonSchemaDocument;

const isZodV4Schema = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && '_zod' in value;

export type InstallJsonSchemaDialectShimParams = {
  strapi: Core.Strapi;
  mcpServer: McpServer;
  /** Resolves the SDK-registered tool for a name advertised by `tools/list`. */
  getRegisteredTool: (name: string) => RegisteredTool | undefined;
  /** Conversion function; overridable for tests. Defaults to {@link toJsonSchema2020}. */
  convert?: (schema: unknown, io: JsonSchemaIo) => JsonSchemaDocument;
};

/**
 * Makes `tools/list` advertise JSON Schema 2020-12 instead of draft-07.
 *
 * Why this exists: `@modelcontextprotocol/sdk` (up to and including 1.30.0) converts the Zod
 * schemas given to `registerTool` lazily, inside its own `tools/list` handler, and never passes a
 * `target` to its converter, which then defaults to draft-07. The output is structurally draft-07
 * (`definitions` instead of `$defs`, `items: [...]` instead of `prefixItems`), so clients that
 * validate strictly against 2020-12 — the default dialect since MCP SEP-1613 — reject every tool.
 * See strapi/strapi#27395 and modelcontextprotocol/typescript-sdk#2084. The SDK exposes no option
 * for the emitted dialect, and because the SDK is a runtime dependency installed by each project
 * a local package patch would not reach users.
 *
 * How it works: the SDK's `tools/list` handler is wrapped rather than replaced, so the SDK still
 * assembles every tool definition (title, description, annotations, `_meta`, the empty-object
 * fallback for tools without input). Only `inputSchema` / `outputSchema` are re-emitted, from the
 * same Zod schema, with the 2020-12 target. Conversion happens per request, like the SDK's own,
 * so schemas changed through `RegisteredTool.update()` stay consistent.
 *
 * Private API notice: capturing the SDK's handler reads `Protocol._requestHandlers`, which is
 * private in the SDK typings. The SDK version is pinned exactly, the access is feature-detected
 * and, if the shape ever differs, this function logs a warning and leaves the server untouched —
 * behaviour then falls back to the SDK default rather than breaking. Per-tool conversion failures
 * likewise keep the SDK's document for that tool. Remove this shim once the SDK emits 2020-12.
 *
 * Must be called after tools have been registered: the SDK installs its `tools/list` handler on
 * the first `registerTool` call.
 *
 * @returns `true` when the wrapper was installed, `false` when it was skipped.
 */
export const installJsonSchemaDialectShim = ({
  strapi,
  mcpServer,
  getRegisteredTool,
  convert = toJsonSchema2020,
}: InstallJsonSchemaDialectShimParams): boolean => {
  const server = mcpServer.server as unknown as {
    _requestHandlers?: unknown;
    setRequestHandler?: unknown;
  };

  const handlers = server?._requestHandlers;
  const method = 'tools/list';

  if (!(handlers instanceof Map) || typeof server.setRequestHandler !== 'function') {
    strapi.log.warn(
      '[MCP] Could not install the JSON Schema 2020-12 shim for tools/list: unexpected MCP SDK internals. Advertised tool schemas will use the SDK default dialect.'
    );
    return false;
  }

  const previous = handlers.get(method) as RequestHandler | undefined;
  if (typeof previous !== 'function') {
    // No tool was registered, so the SDK has not installed a tools/list handler yet.
    return false;
  }

  const rewriteSchema = (
    toolName: string,
    field: 'inputSchema' | 'outputSchema',
    advertised: unknown,
    zodSchema: unknown,
    io: JsonSchemaIo
  ): unknown => {
    if (advertised === undefined || !isZodV4Schema(zodSchema)) {
      return advertised;
    }

    try {
      return convert(zodSchema, io);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.debug(
        `[MCP] Could not convert ${field} of tool "${toolName}" to JSON Schema 2020-12, keeping the SDK document: ${message}`
      );
      return advertised;
    }
  };

  mcpServer.server.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const result = (await previous(request, extra)) as ListToolsResult;

    if (!result || !Array.isArray(result.tools)) {
      return result as never;
    }

    const tools = result.tools.map((tool) => {
      const registered = getRegisteredTool(tool.name);
      if (!registered) {
        return tool;
      }

      return {
        ...tool,
        inputSchema: rewriteSchema(
          tool.name,
          'inputSchema',
          tool.inputSchema,
          registered.inputSchema,
          'input'
        ),
        ...(tool.outputSchema !== undefined && {
          outputSchema: rewriteSchema(
            tool.name,
            'outputSchema',
            tool.outputSchema,
            registered.outputSchema,
            'output'
          ),
        }),
      };
    });

    return { ...result, tools } as never;
  });

  return true;
};
