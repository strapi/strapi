import * as z from 'zod';
import { makeMcpToolDefinition } from '../tool-registry';
import { getDisplayableContentTypes } from '../utils/getDisplayableContentTypes';

const attributeSchema = z.object({
  name: z.string().describe('Field name used in API requests'),
  type: z
    .string()
    .describe('Field type (string, text, richtext, integer, boolean, relation, etc.)'),
  required: z.boolean().describe('Whether this field is required when creating/updating'),
  unique: z.boolean().optional().describe('Whether values must be unique'),
  private: z.boolean().optional().describe('Whether field is hidden from API responses'),
  configurable: z.boolean().optional().describe('Whether field can be configured in admin'),
  description: z.string().optional().describe('Field description from schema'),
  default: z.any().optional().describe('Default value if not provided'),
  minLength: z.number().optional().describe('Minimum length for string fields'),
  maxLength: z.number().optional().describe('Maximum length for string fields'),
  min: z.number().optional().describe('Minimum value for number fields'),
  max: z.number().optional().describe('Maximum value for number fields'),
  enum: z.array(z.string()).optional().describe('Allowed values for enumeration fields'),
  relationType: z
    .string()
    .optional()
    .describe('Relation type (oneToOne, oneToMany, manyToOne, manyToMany)'),
  targetContentType: z.string().optional().describe('Target content type UID for relations'),
});

const contentTypeSchemaOutputSchema = z.object({
  data: z.object({
    uid: z.string().describe('Unique identifier for the content type'),
    kind: z
      .enum(['collectionType', 'singleType'])
      .describe('collectionType has multiple entries; singleType has one entry'),
    displayName: z.string().describe('Human-readable name shown in admin panel'),
    singularName: z.string().describe('Singular name used in tool names'),
    pluralName: z.string().describe('Plural name used in tool names'),
    description: z.string().optional().describe('Content type description'),
    draftAndPublish: z.boolean().optional().describe('Whether draft/publish workflow is enabled'),
    attributes: z
      .array(attributeSchema)
      .describe('List of fields/attributes for this content type'),
  }),
});

/**
 * Format attribute information for MCP response
 */
const formatAttribute = (
  name: string,
  attr: Record<string, any>
): z.infer<typeof attributeSchema> => {
  const formatted: z.infer<typeof attributeSchema> = {
    name,
    type: attr.type || 'unknown',
    required: attr.required === true,
  };

  // Add optional properties if present
  if (attr.unique !== undefined) formatted.unique = attr.unique;
  if (attr.private !== undefined) formatted.private = attr.private;
  if (attr.configurable !== undefined) formatted.configurable = attr.configurable;
  if (attr.description) formatted.description = attr.description;
  if (attr.default !== undefined) formatted.default = attr.default;
  if (attr.minLength !== undefined) formatted.minLength = attr.minLength;
  if (attr.maxLength !== undefined) formatted.maxLength = attr.maxLength;
  if (attr.min !== undefined) formatted.min = attr.min;
  if (attr.max !== undefined) formatted.max = attr.max;
  if (attr.enum) formatted.enum = attr.enum;

  // Handle relations
  if (attr.type === 'relation' && attr.relation) {
    formatted.relationType = attr.relation;
    if (attr.target) {
      formatted.targetContentType = attr.target;
    }
  }

  return formatted;
};

export const getContentTypeSchemaToolDefinition = makeMcpToolDefinition({
  name: 'get_content_type_schema',
  title: 'Get Content Type Schema',
  description:
    'Retrieves the schema for a specific content type, including all fields/attributes with their types, constraints, and relations. Use this to understand what fields are required before creating or updating content. Pass the uid (e.g., "api::article.article") or singularName (e.g., "article").',
  inputSchema: z.object({
    identifier: z
      .string()
      .describe(
        'Content type identifier - either the full uid (e.g., "api::article.article") or the singularName/pluralName (e.g., "article" or "articles"). Use list_content_types to see available content types.'
      ),
  }),
  outputSchema: contentTypeSchemaOutputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  auth: {
    actions: ['plugin::content-type-builder.read'],
  },
  createHandler: (strapi) => async (params) => {
    try {
      const { identifier } = params;
      const displayedContentTypes = getDisplayableContentTypes(strapi.contentTypes);

      // Find content type by uid, singularName, or pluralName
      const found = displayedContentTypes.find(({ uid, contentType: ct }) => {
        if (uid === identifier) return true;
        if (ct.info.singularName === identifier) return true;
        if (ct.info.pluralName === identifier) return true;
        // Also check without api:: prefix
        const shortUid = uid.split('.').pop();
        if (shortUid === identifier) return true;
        return false;
      });

      if (!found) {
        const availableTypes = displayedContentTypes
          .map(({ contentType: ct }) => ct.info.singularName)
          .join(', ');
        return {
          content: [
            {
              type: 'text' as const,
              text: `Content type "${identifier}" not found. Available content types: ${availableTypes}. Use list_content_types to see all available content types with their identifiers.`,
            },
          ],
          structuredContent: {
            data: null as unknown as z.infer<typeof contentTypeSchemaOutputSchema>['data'],
          },
          isError: true,
        };
      }

      const { uid, contentType: ct } = found;

      // Format attributes
      const attributes = Object.entries(ct.attributes || {})
        .filter(([name]) => {
          // Skip internal Strapi fields that users don't interact with directly
          const internalFields = ['createdBy', 'updatedBy', 'localizations', 'locale'];
          return !internalFields.includes(name);
        })
        .map(([name, attr]) => formatAttribute(name, attr as Record<string, any>));

      const result = {
        data: {
          uid,
          kind: ct.kind as 'collectionType' | 'singleType',
          displayName: ct.info.displayName,
          singularName: ct.info.singularName,
          pluralName: ct.info.pluralName,
          description: ct.info.description,
          draftAndPublish: ct.options?.draftAndPublish,
          attributes,
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
            text: `Failed to get content type schema: ${errorMessage}. Use list_content_types to see available content types.`,
          },
        ],
        structuredContent: {
          data: null as unknown as z.infer<typeof contentTypeSchemaOutputSchema>['data'],
        },
        isError: true,
      };
    }
  },
});
