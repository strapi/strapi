import type { Modules } from '@strapi/types';
import type { z } from '@strapi/utils';

/**
 * Shape of an upload MCP tool definition.
 *
 * `Modules.MCP.McpToolDefinitionFields` intersected with the auth access variant, rather than
 * `McpToolDefinition` (which unions `McpAuthAccess` with `McpDevModeAccess`): `registerTool`
 * overloads on the two variants, so a value typed as the union satisfies neither. Every upload
 * tool is auth-gated, so pinning the variant here also keeps `auth` non-optional for callers.
 *
 * The schema generics stay at the erased `z.ZodObject<z.ZodRawShape>` so a heterogeneous array
 * of tools is assignable without a cast. `InputSchema` is pinned to a bare ZodObject rather
 * than its default `ZodObject | undefined`, which is what keeps `args` a real value in the
 * handlers — at the default, the conditional in `McpToolHandler` collapses it to `{ args?: never }`.
 */
export type UploadMcpTool = Modules.MCP.McpToolDefinitionFields<
  string,
  z.ZodObject<z.ZodRawShape>,
  z.ZodObject<z.ZodRawShape>
> &
  Modules.MCP.McpAuthAccess & {
    telemetry: Modules.MCP.McpCapabilityTelemetry;
  };
