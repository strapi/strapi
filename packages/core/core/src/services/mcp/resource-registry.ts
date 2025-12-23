// eslint-disable-next-line import/extensions
import type { McpServer, RegisteredResource } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Core, Modules } from '@strapi/types';
import { McpCapabilityDefinitions } from './internal/McpCapabilityDefinitions';
import {
  type McpCapabilityRegistry,
  McpCapabilityRegistryBase,
} from './internal/McpCapabilityRegistry';

export const makeMcpResourceDefinition = <Name extends string>(
  resource: Modules.MCP.McpResourceDefinition<Name>
): Modules.MCP.McpResourceDefinition<Name> => resource;

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
    definitions: McpCapabilityDefinitions<'resource', Modules.MCP.McpResourceDefinition>;
  }) {
    super(ctx.definitions);
    this.#strapi = ctx.strapi;
  }

  bind(mcpServer: McpServer) {
    super.register((definition) => {
      const { name, uri, metadata, createHandler } = definition;

      return mcpServer.registerResource(name, uri, metadata, createHandler(this.#strapi));
    });
  }
}
