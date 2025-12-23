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

export interface McpCapabilityDefinition<Name extends string = string> {
  name: Name;
  devModeOnly: boolean;
}

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

export interface McpToolDefinition<
  Name extends string = string,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  Title extends string = string,
  Description extends string = string,
> extends McpCapabilityDefinition<Name> {
  title: Title;
  description: Description;
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  createHandler: (strapi: Core.Strapi) => McpToolCallback<InputSchema, OutputSchema>;
}

export type McpPromptCallback<ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined> =
  ArgsSchema extends z.ZodTypeAny
    ? (
        args: z.infer<ArgsSchema>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ) => Promise<GetPromptResult>
    : (extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<GetPromptResult>;

export interface McpPromptDefinition<
  Name extends string = string,
  ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  Title extends string = string,
  Description extends string = string,
> extends McpCapabilityDefinition<Name> {
  title: Title;
  description: Description;
  argsSchema?: ArgsSchema;
  createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
}

export type McpResourceCallback = (
  uri: URL,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => Promise<ReadResourceResult>;

export interface McpResourceDefinition<Name extends string = string>
  extends McpCapabilityDefinition<Name> {
  uri: string;
  metadata: ResourceMetadata;
  createHandler: (strapi: Core.Strapi) => McpResourceCallback;
}

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
  >(tool: {
    name: Name;
    title: Title;
    description: Description;
    inputSchema?: InputSchema;
    outputSchema: OutputSchema;
    devModeOnly: boolean;
    createHandler: (strapi: Core.Strapi) => McpToolCallback<InputSchema, OutputSchema>;
  }): void;

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
  >(prompt: {
    name: Name;
    title: Title;
    description: Description;
    argsSchema?: ArgsSchema;
    devModeOnly: boolean;
    createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
  }): void;

  /**
   * Register a single MCP resource.
   * Must be called during plugin register() phase, before MCP server starts.
   * @throws Error if called after MCP server has started
   */
  registerResource<Name extends string>(resource: {
    name: Name;
    uri: string;
    metadata: ResourceMetadata;
    devModeOnly: boolean;
    createHandler: (strapi: Core.Strapi) => McpResourceCallback;
  }): void;

  /**
   * Start the MCP server
   */
  start(): Promise<void>;

  /**
   * Stop the MCP server
   */
  stop(): Promise<void>;
}
