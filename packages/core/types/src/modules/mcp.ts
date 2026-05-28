import type { Ability } from '@casl/ability';
import { z } from '@strapi/utils';
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
import type * as Core from '../core';

/** A single CASL permission check: action + optional subject. */
export type McpAuthPolicy = {
  action: string;
  subject?: string;
};

/**
 * Auth requirement for a non-dev MCP capability.
 * The session gate passes when the user's ability satisfies ANY policy in the array.
 */
export type McpCapabilityAuth = {
  policies: [McpAuthPolicy, ...McpAuthPolicy[]];
};

/**
 * Per-request context injected into MCP tool handler factories.
 * Carries the authenticated session's ability so handlers can enforce
 * field-level and entity-level permission checks identical to HTTP controllers.
 * Also carries the token owner's user so write handlers can call setCreatorFields.
 */
export type McpHandlerContext = {
  userAbility: Ability;
  user: { id: string | number };
};

export type McpCapabilityAccess =
  | {
      devModeOnly: true;
      auth?: never;
    }
  | {
      devModeOnly?: never;
      auth: McpCapabilityAuth;
    };

export type McpCapabilityTelemetry = {
  source?: string;
  /** Sanitized name override — replaces raw capability name in analytics */
  name?: string;
};

/**
 * Base definition for Strapi MCP capabilities
 */
export type McpCapabilityDefinition<Name extends string = string> = {
  name: Name;
  telemetry?: McpCapabilityTelemetry;
} & McpCapabilityAccess;

/**
 * Handler function for Strapi MCP tools.
 * Receives a single object parameter `{ args, extra }`.
 * When InputSchema is a ZodObject, `args` is typed as its inferred shape.
 * When InputSchema is undefined, `args` is `never` (omit it in destructuring).
 */
export type McpToolHandler<
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = (
  params: {
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>;
  } & (InputSchema extends z.ZodObject<z.ZodRawShape>
    ? { args: z.infer<InputSchema> }
    : { args?: never })
) => Promise<McpToolHandlerReturn<OutputSchema>>;

/**
 * Return type for Strapi MCP tool handlers.
 */
export type McpToolHandlerReturn<
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> =
  | {
      content: ContentBlock[];
      structuredContent?: never;
      isError: true;
    }
  | {
      content: ContentBlock[];
      structuredContent: z.infer<OutputSchema>;
      isError?: never;
    };

export type McpToolSchemaResolver<Schema> = (context: McpHandlerContext) => Schema;

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
> = McpCapabilityDefinition<Name> & {
  title: Title;
  description: Description;
  resolveInputSchema?: McpToolSchemaResolver<InputSchema>;
  resolveOutputSchema: McpToolSchemaResolver<OutputSchema>;
  createHandler: (
    strapi: Core.Strapi,
    context: McpHandlerContext
  ) => McpToolHandler<NoInfer<InputSchema>, NoInfer<OutputSchema>>;
};

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
 * Available on strapi.ai.mcp.
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
  >(tool: {
    name: Name;
    title: Title;
    description: Description;
    resolveInputSchema?: McpToolSchemaResolver<InputSchema>;
    resolveOutputSchema: McpToolSchemaResolver<OutputSchema>;
    devModeOnly: true;
    auth?: never;
    createHandler: (
      strapi: Core.Strapi,
      context: McpHandlerContext
    ) => McpToolHandler<NoInfer<InputSchema>, NoInfer<OutputSchema>>;
  }): void;
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
    resolveInputSchema?: McpToolSchemaResolver<InputSchema>;
    resolveOutputSchema: McpToolSchemaResolver<OutputSchema>;
    devModeOnly?: never;
    auth: McpCapabilityAuth;
    createHandler: (
      strapi: Core.Strapi,
      context: McpHandlerContext
    ) => McpToolHandler<NoInfer<InputSchema>, NoInfer<OutputSchema>>;
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
    devModeOnly: true;
    auth?: never;
    createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
  }): void;
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
    devModeOnly?: never;
    auth: McpCapabilityAuth;
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
    devModeOnly: true;
    auth?: never;
    createHandler: (strapi: Core.Strapi) => McpResourceCallback;
  }): void;
  registerResource<Name extends string>(resource: {
    name: Name;
    uri: string;
    metadata: ResourceMetadata;
    devModeOnly?: never;
    auth: McpCapabilityAuth;
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
