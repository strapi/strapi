import type {
  McpServer,
  RegisteredResource,
  // eslint-disable-next-line import/extensions
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';
import { createSafeCapabilityRegistration } from './utils/createSafeCapabilityRegistration';
import { wrapCapabilityHandlerForMetrics } from './metrics/wrapCapabilityHandlerForMetrics';

/**
 * Defines a Strapi MCP resource with full type inference, ready to pass to
 * `strapi.ai.mcp.registerResource()`. Exposed publicly as `mcp.defineResource`.
 *
 * The returned value is the definition unchanged — this builder only exists to
 * infer the `name` and narrow the access variant (`devModeOnly` vs `auth`) so the
 * result is directly assignable to `registerResource`.
 *
 * @param resource - The resource definition. Provide either `devModeOnly: true`
 * (dev-only, no auth) or an `auth` policy set — never both.
 * @returns The same definition, with its access variant narrowed.
 *
 * @example
 * ```ts
 * import { mcp } from '@strapi/strapi';
 *
 * const appInfo = mcp.defineResource({
 *   name: 'app-info',
 *   uri: 'strapi://app/info',
 *   metadata: { description: 'Metadata about the app', mimeType: 'application/json' },
 *   devModeOnly: true,
 *   createHandler: (strapi) => async (uri) => ({
 *     contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ ok: true }) }],
 *   }),
 * });
 *
 * // later, in register() or bootstrap():
 * strapi.ai.mcp.registerResource(appInfo);
 * ```
 */
export const makeMcpResourceDefinition = ((definition: Modules.MCP.McpResourceDefinition) =>
  definition) as unknown as Modules.MCP.McpResourceBuilder;

export class McpResourceRegistry
  extends McpCapabilityRegistryBase<
    'resource',
    Modules.MCP.McpResourceDefinition,
    RegisteredResource
  >
  implements McpCapabilityRegistry
{
  #strapi: Core.Strapi;

  constructor(ctx: {
    strapi: Core.Strapi;
    definitions: McpCapabilityDefinitionRegistry<'resource', Modules.MCP.McpResourceDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    const strapi = this.#strapi;

    super.register((definition) => {
      const { name, uri, metadata, createHandler } = definition;

      return createSafeCapabilityRegistration({
        strapi,
        capabilityType: 'Resource',
        name,
        createHandler,
        createFallbackHandler(errorMessage) {
          return async (resourceUri) => ({
            contents: [
              {
                uri: resourceUri.href,
                text: `Resource "${name}" failed to initialize: ${errorMessage}`,
                mimeType: 'text/plain',
              },
            ],
          });
        },
        createErrorResult(error, args) {
          return {
            contents: [
              {
                uri: args[0] instanceof URL ? args[0].href : uri,
                text: `Resource "${name}" execution failed: ${error.message}`,
                mimeType: 'text/plain',
              },
            ],
          };
        },
        registerWithSdk(safeHandler) {
          const sdkHandler = wrapCapabilityHandlerForMetrics(
            strapi,
            'resource',
            name,
            definition.telemetry,
            safeHandler
          );

          return mcpServer.registerResource(name, uri, metadata, sdkHandler);
        },
      });
    });
  }
}
