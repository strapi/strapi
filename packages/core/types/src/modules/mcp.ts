// eslint-disable-next-line import/extensions
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ServerNotification,
  ServerRequest,
  ContentBlock,
  GetPromptResult,
  ReadResourceResult,
  // eslint-disable-next-line import/extensions
} from '@modelcontextprotocol/sdk/types.js';
// eslint-disable-next-line import/extensions
import type { ResourceMetadata } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import * as z from 'zod';
import type * as Core from '../core';
import { XOR } from '../utils';

/**
 * Base definition for Strapi MCP capabilities definition
 */
export type McpCapabilityDefinition<Name extends string = string> = {
  name: Name;
} & McpCapabilityDefinitionExclusiveSettings;

/**
 * Exclusive settings for Strapi MCP capabilities definition
 */
export type McpCapabilityDefinitionExclusiveSettings = XOR<
  {
    /**
     * If true, the capability will only be enabled if the MCP server is running in dev mode.
     */
    devModeOnly: true;
  },
  {
    /**
     * Optional authentication requirements for this capability.
     * If specified, the capability will only be enabled if the authenticated user's
     * ability satisfies all required actions.
     */
    auth: {
      /**
       * Array of admin/plugin action IDs that must be satisfied.
       * Examples: 'admin::roles.read', 'plugin::content-manager.explorer.read'
       */
      actions: string[];
      /**
       * Optional subject (e.g. content type UID) that the action applies to.
       * Used for permissions that require both action and subject.
       */
      subject?: string;
    };
  }
>;

/**
 * Callback function for Strapi MCP tools
 */
export type McpToolCallback<
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape>,
> = InputSchema extends z.ZodTypeAny
  ? (
      args: z.infer<InputSchema>,
      extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => Promise<{
      content: ContentBlock[];
      structuredContent: z.infer<OutputSchema>;
      isError?: boolean;
    }>
  : (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<{
      content: ContentBlock[];
      structuredContent: z.infer<OutputSchema>;
      isError?: boolean;
    }>;

/**
 * Definition for Strapi MCP tools
 */
export type McpToolDefinition<
  Name extends string = string,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  Title extends string = string,
  Description extends string = string,
> = {
  title: Title;
  description: Description;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  createHandler: (strapi: Core.Strapi) => McpToolCallback<InputSchema, OutputSchema>;
} & McpCapabilityDefinition<Name>;

/**
 * Callback function for Strapi MCP prompts
 */
export type McpPromptCallback<ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined> =
  ArgsSchema extends z.ZodTypeAny
    ? (
        args: z.infer<ArgsSchema>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => Promise<GetPromptResult>
    : (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<GetPromptResult>;

/**
 * Definition for Strapi MCP prompts
 */
export type McpPromptDefinition<
  Name extends string = string,
  ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  Title extends string = string,
  Description extends string = string,
> = McpCapabilityDefinition<Name> & {
  title: Title;
  description: Description;
  argsSchema?: ArgsSchema;
  createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
};

/**
 * Callback function for Strapi MCP resources
 */
export type McpResourceCallback = (
  uri: URL,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => Promise<ReadResourceResult>;

/**
 * Definition for Strapi MCP resources
 */
export type McpResourceDefinition<Name extends string = string> = McpCapabilityDefinition<Name> & {
  uri: string;
  metadata: ResourceMetadata;
  createHandler: (strapi: Core.Strapi) => McpResourceCallback;
};

export type McpServiceStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Service providing Model Context Protocol (MCP) capabilities.
 * Available on Strapi.mcp.
 */
export interface McpService {
  /**
   * Check if the MCP service is enabled in configuration
   */
  isEnabled(): boolean;

  /**
   * Check if the MCP server is currently running
   */
  isRunning(): boolean;

  /**
   * Register a single MCP tool.
   * Must be called during plugin register() phase, before MCP server starts.
   * @throws Error if called after MCP server has started
   */
  registerTool<
    Name extends string,
    OutputSchema extends z.ZodObject<z.ZodRawShape>,
    Title extends string,
    Description extends string,
    InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  >(
    tool: {
      name: Name;
      title: Title;
      description: Description;
      inputSchema?: InputSchema;
      outputSchema: OutputSchema;
      createHandler: (strapi: Core.Strapi) => McpToolCallback<InputSchema, OutputSchema>;
    } & XOR<{ devModeOnly: true }, { auth: { actions: string[]; subject?: string } }>
  ): void;

  /**
   * Register a single MCP prompt.
   * Must be called during plugin register() phase, before MCP server starts.
   * @throws Error if called after MCP server has started
   */
  registerPrompt<
    Name extends string,
    ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
    Title extends string,
    Description extends string,
  >(
    prompt: {
      name: Name;
      title: Title;
      description: Description;
      argsSchema?: ArgsSchema;
      createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
    } & XOR<{ devModeOnly: true }, { auth: { actions: string[]; subject?: string } }>
  ): void;

  /**
   * Register a single MCP resource.
   * Must be called during plugin register() phase, before MCP server starts.
   * @throws Error if called after MCP server has started
   */
  registerResource<Name extends string>(
    resource: {
      name: Name;
      uri: string;
      metadata: ResourceMetadata;
      createHandler: (strapi: Core.Strapi) => McpResourceCallback;
    } & XOR<{ devModeOnly: true }, { auth: { actions: string[]; subject?: string } }>
  ): void;

  /**
   * Start the MCP server
   */
  start(): Promise<void>;

  /**
   * Stop the MCP server
   */
  stop(): Promise<void>;
}
