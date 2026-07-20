import type { Struct, Modules, Core } from '@strapi/types';
import type { z } from '@strapi/utils';

export type ContentManagerModelForMcp = Pick<
  Struct.ContentTypeSchema,
  'uid' | 'kind' | 'options'
> & {
  /** Present on content-manager DTOs from data-mapper.toContentManagerModel */
  apiID: string;
  /**
   * Formatted attributes from data-mapper.toContentManagerModel (includes id, documentId,
   * timestamps, creator fields).
   */
  attributes: Struct.SchemaAttributes;
};

export type McpToolsBuildContext = {
  /** Installed locale codes from i18n plugin. null when i18n is not installed. */
  localeCodes: [string, ...string[]] | null;
  /** Default locale from i18n plugin. null when i18n is not installed or unknown. */
  defaultLocale: string | null;
};

export type DerivedTool = {
  name: string;
  telemetry: { source: 'content-manager'; name: string };
  title: string;
  description: string;
  auth: Modules.MCP.McpCapabilityAuth;
  resolveInputSchema: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  resolveOutputSchema: (context: Modules.MCP.McpHandlerContext) => z.ZodObject<z.ZodRawShape>;
  createHandler: (
    strapi: Core.Strapi,
    context: Modules.MCP.McpHandlerContext
  ) => Modules.MCP.McpToolHandler<z.ZodObject<z.ZodRawShape>, z.ZodObject<z.ZodRawShape>>;
};
