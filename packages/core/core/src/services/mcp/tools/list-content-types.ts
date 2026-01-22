import * as z from 'zod';
import { makeMcpToolDefinition } from '../tool-registry';
import { getDisplayableContentTypes } from '../utils/getDisplayableContentTypes';

const contentTypeInfoSchema = z.object({
  uid: z.string().describe('Unique identifier for the content type (e.g., "api::article.article")'),
  kind: z
    .enum(['collectionType', 'singleType'])
    .describe('collectionType has multiple entries; singleType has one entry'),
  displayName: z.string().describe('Human-readable name shown in the admin panel'),
  singularName: z.string().describe('Singular name used in tool names (e.g., get_<singularName>)'),
  pluralName: z.string().describe('Plural name used in tool names (e.g., list_<pluralName>)'),
  description: z.string().optional().describe('Optional description of the content type'),
  draftAndPublish: z
    .boolean()
    .optional()
    .describe('Whether this content type supports draft/publish workflow'),
});

const listContentTypesOutputSchema = z.object({
  data: z.array(contentTypeInfoSchema),
  meta: z.object({
    total: z.number(),
  }),
});

export const listContentTypesToolDefinition = makeMcpToolDefinition({
  name: 'list_content_types',
  title: 'List Content Types',
  description:
    'Retrieves all available content types in the Strapi project. Call this FIRST to discover what data is available. Use get_content_type_schema to see fields for a specific content type. Use list_<pluralName> for collections or get_<singularName> for single types.',
  outputSchema: listContentTypesOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  auth: {
    actions: ['plugin::content-type-builder.read'],
  },
  createHandler: (strapi) => async () => {
    try {
      // Get displayable content types (exclude admin, plugin internals)
      const displayedContentTypes = getDisplayableContentTypes(strapi.contentTypes).map(
        ({ uid, contentType: ct }) => ({
          uid,
          kind: ct.kind as 'collectionType' | 'singleType',
          displayName: ct.info.displayName,
          singularName: ct.info.singularName,
          pluralName: ct.info.pluralName,
          description: ct.info.description,
          draftAndPublish: ct.options?.draftAndPublish,
        })
      );

      const result = {
        data: displayedContentTypes,
        meta: {
          total: displayedContentTypes.length,
        },
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to list content types: ${errorMessage}. This may indicate a server configuration issue. Contact the Strapi administrator.`,
          },
        ],
        structuredContent: { data: [], meta: { total: 0 } },
        isError: true,
      };
    }
  },
});
