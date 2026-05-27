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

export const makeMcpResourceDefinition = <Definition extends Modules.MCP.McpResourceDefinition>(
  resource: Definition
): Definition => resource;

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
    super.register((definition) => {
      const { name, uri, metadata, createHandler } = definition;

      return createSafeCapabilityRegistration({
        strapi: this.#strapi,
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
          return mcpServer.registerResource(name, uri, metadata, safeHandler);
        },
      });
    });
  }
}
