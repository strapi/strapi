import type { Ability } from '@casl/ability';
import { z } from '@strapi/utils';
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

/** Access variant for dev-mode-only capabilities (no auth policies). */
export type McpDevModeAccess = {
  devModeOnly: true;
  auth?: never;
};

/** Access variant for capabilities gated by CASL auth policies. */
export type McpAuthAccess = {
  devModeOnly?: never;
  auth: McpCapabilityAuth;
};

export type McpCapabilityAccess = McpDevModeAccess | McpAuthAccess;

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
 * Information about the token authenticated for an MCP request.
 */
export type McpHandlerAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
  resource?: URL;
  extra?: Record<string, unknown>;
};

/**
 * Information about the HTTP request that originated an MCP invocation.
 */
export type McpHandlerRequestInfo = {
  headers: Record<string, string | string[] | undefined>;
  url?: URL;
};

/**
 * Request-scoped facts Strapi provides to MCP capability handlers.
 *
 * Every fact is optional because availability depends on the request and transport.
 * Strapi owns this contract and normalizes it independently of the underlying MCP SDK.
 */
export type McpCapabilityHandlerContext = {
  signal?: AbortSignal;
  requestId?: string | number;
  sessionId?: string;
  authInfo?: McpHandlerAuthInfo;
  _meta?: Record<string, unknown>;
  requestInfo?: McpHandlerRequestInfo;
};

/**
 * Who a piece of MCP content is authored by or intended for.
 */
export type McpRole = 'user' | 'assistant';

/**
 * Hints a capability can attach to content so clients can decide how to surface it.
 */
export type McpContentAnnotations = {
  audience?: McpRole[];
  /** Relative importance between 0 and 1. */
  priority?: number;
  /** ISO 8601 timestamp with offset. */
  lastModified?: string;
};

/**
 * An icon a capability can advertise alongside a resource.
 */
export type McpIcon = {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: 'light' | 'dark';
};

/**
 * Protocol extension metadata. Strapi carries these keys to the client untouched.
 */
export type McpMetadata = Record<string, unknown>;

/** Text content in a tool or prompt result. */
export type McpTextContent = {
  type: 'text';
  text: string;
  annotations?: McpContentAnnotations;
  _meta?: McpMetadata;
};

/** Base64-encoded image content in a tool or prompt result. */
export type McpImageContent = {
  type: 'image';
  data: string;
  mimeType: string;
  annotations?: McpContentAnnotations;
  _meta?: McpMetadata;
};

/** Base64-encoded audio content in a tool or prompt result. */
export type McpAudioContent = {
  type: 'audio';
  data: string;
  mimeType: string;
  annotations?: McpContentAnnotations;
  _meta?: McpMetadata;
};

/** The textual contents of a resource. */
export type McpTextResourceContents = {
  uri: string;
  mimeType?: string;
  text: string;
  _meta?: McpMetadata;
};

/** The binary contents of a resource, base64-encoded. */
export type McpBlobResourceContents = {
  uri: string;
  mimeType?: string;
  blob: string;
  _meta?: McpMetadata;
};

/** The contents of a resource, in either of its two representations. */
export type McpResourceContents = McpTextResourceContents | McpBlobResourceContents;

/**
 * Facts advertised about a resource before it is read: identity is supplied at
 * registration, so only the listing attributes belong here.
 *
 * Distinct from {@link McpResourceReadResult}, which carries what a read returns.
 */
export type McpResourceListingMetadata = {
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  icons?: McpIcon[];
  annotations?: McpContentAnnotations;
  _meta?: McpMetadata;
};

/** A pointer to a resource, embedded in a tool or prompt result. */
export type McpResourceLinkContent = McpResourceListingMetadata & {
  type: 'resource_link';
  name: string;
  uri: string;
};

/** Resource contents inlined into a tool or prompt result. */
export type McpEmbeddedResourceContent = {
  type: 'resource';
  resource: McpResourceContents;
  annotations?: McpContentAnnotations;
  _meta?: McpMetadata;
};

/**
 * A single block of human-readable content in a tool or prompt result.
 *
 * Strapi owns this union: a variant the MCP protocol gains later becomes available
 * to capability authors only once Strapi adds it here.
 */
export type McpContentBlock =
  | McpTextContent
  | McpImageContent
  | McpAudioContent
  | McpResourceLinkContent
  | McpEmbeddedResourceContent;

/**
 * The value a Strapi MCP tool handler returns.
 *
 * A successful result must carry structured data matching the advertised output
 * schema; a failed result is marked with `isError` and carries none.
 */
export type McpToolResult<
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> =
  | {
      content: McpContentBlock[];
      structuredContent?: never;
      isError: true;
    }
  | {
      content: McpContentBlock[];
      structuredContent: z.infer<OutputSchema>;
      isError?: never;
    };

/** A single message in a prompt result. */
export type McpPromptMessage = {
  role: McpRole;
  content: McpContentBlock;
};

/**
 * The value a Strapi MCP prompt handler returns.
 *
 * Extension fields beyond the declared members reach the client unchanged.
 */
export type McpPromptResult = {
  description?: string;
  messages: McpPromptMessage[];
  _meta?: McpMetadata;
  [extensionField: string]: unknown;
};

/**
 * The value a Strapi MCP resource handler returns when a resource is read.
 *
 * Extension fields beyond the declared members reach the client unchanged.
 */
export type McpResourceReadResult = {
  contents: McpResourceContents[];
  _meta?: McpMetadata;
  [extensionField: string]: unknown;
};

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
    extra: McpCapabilityHandlerContext;
  } & (InputSchema extends z.ZodObject<z.ZodRawShape>
    ? { args: z.infer<InputSchema> }
    : { args?: never })
) => Promise<McpToolHandlerReturn<OutputSchema>>;

/**
 * Established name for {@link McpToolResult}, kept so existing handler
 * annotations continue to compile with the same meaning.
 */
export type McpToolHandlerReturn<
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> = McpToolResult<OutputSchema>;

export type McpToolSchemaResolver<Schema> = (context: McpHandlerContext) => Schema;

/**
 * Access-agnostic fields of a Strapi MCP tool definition.
 * Shared by the `defineTool` builder ({@link McpToolBuilder}) and
 * `McpService.registerTool`, then intersected with an access variant
 * ({@link McpDevModeAccess} or {@link McpAuthAccess}).
 */
export type McpToolDefinitionFields<
  Name extends string = string,
  InputSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  OutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  Title extends string = string,
  Description extends string = string,
> = {
  name: Name;
  title: Title;
  description: Description;
  telemetry?: McpCapabilityTelemetry;
  resolveInputSchema?: McpToolSchemaResolver<InputSchema>;
  resolveOutputSchema: McpToolSchemaResolver<OutputSchema>;
  createHandler: (
    strapi: Core.Strapi,
    context: McpHandlerContext
  ) => McpToolHandler<NoInfer<InputSchema>, NoInfer<OutputSchema>>;
};

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
> = McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
  McpCapabilityAccess;

/**
 * Builder for Strapi MCP tool definitions, exposed publicly as `ai.mcp.defineTool`.
 * Identity at runtime — its only job is to infer and narrow the access variant
 * (`devModeOnly` vs `auth`) so the result is directly assignable to
 * {@link McpService.registerTool}.
 */
export interface McpToolBuilder {
  <
    Name extends string,
    OutputSchema extends z.ZodObject<z.ZodRawShape>,
    Title extends string,
    Description extends string,
    InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  >(
    tool: McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
      McpDevModeAccess
  ): McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
    McpDevModeAccess;
  <
    Name extends string,
    OutputSchema extends z.ZodObject<z.ZodRawShape>,
    Title extends string,
    Description extends string,
    InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  >(
    tool: McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
      McpAuthAccess
  ): McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> & McpAuthAccess;
}

/**
 * Callback function for Strapi MCP prompts
 */
export type McpPromptCallback<ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined> =
  ArgsSchema extends z.ZodTypeAny
    ? (args: z.infer<ArgsSchema>, extra: McpCapabilityHandlerContext) => Promise<McpPromptResult>
    : (extra: McpCapabilityHandlerContext) => Promise<McpPromptResult>;

/**
 * Access-agnostic fields of a Strapi MCP prompt definition.
 * Shared by the `definePrompt` builder ({@link McpPromptBuilder}) and
 * `McpService.registerPrompt`, then intersected with an access variant.
 */
export type McpPromptDefinitionFields<
  Name extends string = string,
  ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined =
    | z.ZodObject<z.ZodRawShape>
    | undefined,
  Title extends string = string,
  Description extends string = string,
> = {
  name: Name;
  title: Title;
  description: Description;
  argsSchema?: ArgsSchema;
  telemetry?: McpCapabilityTelemetry;
  createHandler: (strapi: Core.Strapi) => McpPromptCallback<ArgsSchema>;
};

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
> = McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpCapabilityAccess;

/**
 * Builder for Strapi MCP prompt definitions, exposed publicly as `ai.mcp.definePrompt`.
 * Identity at runtime — narrows the access variant for {@link McpService.registerPrompt}.
 */
export interface McpPromptBuilder {
  <
    Name extends string,
    ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
    Title extends string,
    Description extends string,
  >(
    prompt: McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpDevModeAccess
  ): McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpDevModeAccess;
  <
    Name extends string,
    ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
    Title extends string,
    Description extends string,
  >(
    prompt: McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpAuthAccess
  ): McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpAuthAccess;
}

/**
 * Callback function for Strapi MCP resources
 */
export type McpResourceCallback = (
  uri: URL,
  extra: McpCapabilityHandlerContext
) => Promise<McpResourceReadResult>;

/**
 * Access-agnostic fields of a Strapi MCP resource definition.
 * Shared by the `defineResource` builder ({@link McpResourceBuilder}) and
 * `McpService.registerResource`, then intersected with an access variant.
 */
export type McpResourceDefinitionFields<Name extends string = string> = {
  name: Name;
  uri: string;
  metadata: McpResourceListingMetadata;
  telemetry?: McpCapabilityTelemetry;
  createHandler: (strapi: Core.Strapi) => McpResourceCallback;
};

/**
 * Definition for Strapi MCP resources
 */
export type McpResourceDefinition<Name extends string = string> =
  McpResourceDefinitionFields<Name> & McpCapabilityAccess;

/**
 * Builder for Strapi MCP resource definitions, exposed publicly as `ai.mcp.defineResource`.
 * Identity at runtime — narrows the access variant for {@link McpService.registerResource}.
 */
export interface McpResourceBuilder {
  <Name extends string>(
    resource: McpResourceDefinitionFields<Name> & McpDevModeAccess
  ): McpResourceDefinitionFields<Name> & McpDevModeAccess;
  <Name extends string>(
    resource: McpResourceDefinitionFields<Name> & McpAuthAccess
  ): McpResourceDefinitionFields<Name> & McpAuthAccess;
}

export type McpServiceStatus = 'idle' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Service providing Model Context Protocol (MCP) capabilities.
 * Available on strapi.ai.mcp.
 *
 * Call `registerTool`, `registerPrompt`, and `registerResource` only during
 * Strapi's register phase. The MCP HTTP server starts during bootstrap.
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
   * Must be called while strapi.ai.mcp is idle, before strapi.ai.mcp.start() runs.
   * In Strapi's load lifecycle, call only from the register phase (plugin register() or app register()).
   * @throws Error if called after the MCP server has started
   */
  registerTool<
    Name extends string,
    OutputSchema extends z.ZodObject<z.ZodRawShape>,
    Title extends string,
    Description extends string,
    InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  >(
    tool: McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
      McpDevModeAccess
  ): void;
  registerTool<
    Name extends string,
    OutputSchema extends z.ZodObject<z.ZodRawShape>,
    Title extends string,
    Description extends string,
    InputSchema extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  >(
    tool: McpToolDefinitionFields<Name, InputSchema, OutputSchema, Title, Description> &
      McpAuthAccess
  ): void;

  /**
   * Register a single MCP prompt.
   * Must be called while strapi.ai.mcp is idle, before strapi.ai.mcp.start() runs.
   * In Strapi's load lifecycle, call only from the register phase (plugin register() or app register()).
   * @throws Error if called after the MCP server has started
   */
  registerPrompt<
    Name extends string,
    ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
    Title extends string,
    Description extends string,
  >(
    prompt: McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpDevModeAccess
  ): void;
  registerPrompt<
    Name extends string,
    ArgsSchema extends z.ZodObject<z.ZodRawShape> | undefined,
    Title extends string,
    Description extends string,
  >(
    prompt: McpPromptDefinitionFields<Name, ArgsSchema, Title, Description> & McpAuthAccess
  ): void;

  /**
   * Register a single MCP resource.
   * Must be called while strapi.ai.mcp is idle, before strapi.ai.mcp.start() runs.
   * In Strapi's load lifecycle, call only from the register phase (plugin register() or app register()).
   * @throws Error if called after the MCP server has started
   */
  registerResource<Name extends string>(
    resource: McpResourceDefinitionFields<Name> & McpDevModeAccess
  ): void;
  registerResource<Name extends string>(
    resource: McpResourceDefinitionFields<Name> & McpAuthAccess
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
