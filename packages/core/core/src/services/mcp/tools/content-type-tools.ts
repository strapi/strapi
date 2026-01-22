import * as z from 'zod';
import type { Core, Modules } from '@strapi/types';
import { makeMcpToolDefinition } from '../tool-registry';
import { getDisplayableContentTypes } from '../utils/getDisplayableContentTypes';

interface ContentTypeToolGeneratorParams {
  strapi: Core.Strapi;
}

/**
 * Helper to get field information from a content type for documentation
 */
const getFieldInfo = (contentType: any) => {
  const internalFields = [
    'createdBy',
    'updatedBy',
    'localizations',
    'locale',
    'createdAt',
    'updatedAt',
    'publishedAt',
    'documentId',
  ];

  const attributes = contentType.attributes || {};
  const fields: { name: string; type: string; required: boolean }[] = [];

  for (const [name, attr] of Object.entries(attributes)) {
    if (internalFields.includes(name)) continue;
    const attrObj = attr as Record<string, any>;
    fields.push({
      name,
      type: attrObj.type || 'unknown',
      required: attrObj.required === true,
    });
  }

  return fields;
};

/**
 * Format field info for tool description
 */
const formatFieldsDescription = (fields: { name: string; type: string; required: boolean }[]) => {
  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  let description = '';

  if (requiredFields.length > 0) {
    description += `Required fields: ${requiredFields.map((f) => `${f.name} (${f.type})`).join(', ')}. `;
  }

  if (optionalFields.length > 0) {
    description += `Optional fields: ${optionalFields.map((f) => `${f.name} (${f.type})`).join(', ')}.`;
  }

  return description;
};

export const generateContentTypeTools = ({
  strapi,
}: ContentTypeToolGeneratorParams): Modules.MCP.McpToolDefinition[] => {
  const tools: Modules.MCP.McpToolDefinition[] = [];

  // Get displayable content types (exclude admin, plugin internals)
  const displayedContentTypes = getDisplayableContentTypes(strapi.contentTypes);

  for (const { uid, contentType } of displayedContentTypes) {
    const modelName = uid.split('.').pop(); // 'api::article.article' -> 'article'
    const pluralName = contentType.info.pluralName || `${modelName}s`;
    const singularName = contentType.info.singularName || modelName;
    const fields = getFieldInfo(contentType);

    // Generate READ tools (find/findOne)
    if (contentType.kind === 'collectionType') {
      const fieldNames = fields.map((f) => f.name).join(', ');
      const listTool = makeMcpToolDefinition({
        name: `list_${pluralName}`,
        title: `List ${contentType.info.displayName || pluralName}`,
        description: `Retrieve a list of ${pluralName} with filtering and pagination. Available fields: ${fieldNames}`,
        inputSchema: z.object({
          filters: z
            .record(z.any())
            .optional()
            .describe(
              `Filter object using Strapi query syntax. Available fields: ${fieldNames}. Examples: { fieldName: { $contains: "test" } }, { fieldName: { $eq: "value" } }`
            ),
          sort: z
            .string()
            .optional()
            .describe(
              `Sort string in format "field:direction". Available fields: ${fieldNames}. Examples: "createdAt:desc", "fieldName:asc"`
            ),
          page: z
            .number()
            .optional()
            .describe('Page number (1-indexed). Defaults to 1 if not specified'),
          pageSize: z
            .number()
            .optional()
            .describe('Number of items per page (1-100). Defaults to 25 if not specified'),
        }),
        outputSchema: z.object({
          data: z.array(z.record(z.any())),
          meta: z.object({
            pagination: z.object({
              page: z.number(),
              pageSize: z.number(),
              pageCount: z.number(),
              total: z.number(),
            }),
          }),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        auth: {
          actions: ['plugin::content-manager.explorer.read'],
          subject: uid,
        },
        createHandler: (strapi) => async (params) => {
          try {
            const documentService = strapi.documents(uid as any);

            const [documents, total] = await Promise.all([
              documentService.findMany({
                filters: params.filters,
                sort: params.sort,
                page: params.page,
                pageSize: params.pageSize,
              }),
              documentService.count({
                filters: params.filters,
              }),
            ]);

            const page = params.page || 1;
            const pageSize = params.pageSize || 25;
            const pageCount = Math.ceil((total as number) / pageSize);

            const result = {
              data: documents as Record<string, any>[],
              meta: {
                pagination: {
                  page,
                  pageSize,
                  pageCount,
                  total: total as number,
                },
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
                  text: `Failed to list ${pluralName}: ${errorMessage}. Check that your filters and sort parameters use valid field names. Use get_content_type_schema to see available fields.`,
                },
              ],
              structuredContent: {
                data: [] as Record<string, any>[],
                meta: { pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 } },
              },
              isError: true,
            };
          }
        },
      });
      tools.push(listTool);

      const getTool = makeMcpToolDefinition({
        name: `get_${singularName}`,
        title: `Get ${contentType.info.displayName || singularName}`,
        description: `Retrieve a single ${singularName} by document ID`,
        inputSchema: z.object({
          documentId: z
            .union([z.string(), z.number()])
            .describe(
              `The unique document ID of the ${singularName} to retrieve (e.g., "z7v8zma53x01r6oceimv922b"). Use list_${pluralName} to find available document IDs`
            ),
        }),
        outputSchema: z.object({
          data: z.record(z.any()),
        }),
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        auth: {
          actions: ['plugin::content-manager.explorer.read'],
          subject: uid,
        },
        createHandler: (strapi) => async (params) => {
          try {
            const documentService = strapi.documents(uid as any);
            const document = await documentService.findOne({
              documentId: String(params.documentId),
            });

            if (!document) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `No ${singularName} found with documentId "${params.documentId}". Use list_${pluralName} to see available ${pluralName} and their document IDs.`,
                  },
                ],
                structuredContent: { data: null as unknown as Record<string, any> },
                isError: true,
              };
            }

            const result = { data: document as Record<string, any> };

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
                  text: `Failed to get ${singularName}: ${errorMessage}. Verify the documentId "${params.documentId}" exists using list_${pluralName}.`,
                },
              ],
              structuredContent: { data: null as unknown as Record<string, any> },
              isError: true,
            };
          }
        },
      });
      tools.push(
        // @ts-expect-error - inputSchema collision
        getTool
      );
    } else {
      // Single type - just get
      tools.push(
        makeMcpToolDefinition({
          name: `get_${singularName}`,
          title: `Get ${contentType.info.displayName || singularName}`,
          description: `Retrieve the ${singularName} content`,
          outputSchema: z.object({
            data: z.record(z.any()),
          }),
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
          auth: {
            actions: ['plugin::content-manager.explorer.read'],
            subject: uid,
          },
          createHandler: (strapi) => async () => {
            try {
              const documentService = strapi.documents(uid as any);
              const document = await documentService.findFirst();

              if (!document) {
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: `The ${singularName} single type has no content yet. Use update_${singularName} to create initial content.`,
                    },
                  ],
                  structuredContent: { data: null as unknown as Record<string, any> },
                  isError: true,
                };
              }

              const result = { data: document as Record<string, any> };

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
                    text: `Failed to get ${singularName}: ${errorMessage}. This is a single type content - verify it exists in the Strapi admin panel.`,
                  },
                ],
                structuredContent: { data: null as unknown as Record<string, any> },
                isError: true,
              };
            }
          },
        })
      );
    }

    // Generate CREATE tool
    if (contentType.kind === 'collectionType') {
      const fieldsDescription = formatFieldsDescription(fields);
      const createTool = makeMcpToolDefinition({
        name: `create_${singularName}`,
        title: `Create ${contentType.info.displayName || singularName}`,
        description: `Create a new ${singularName}. ${fieldsDescription}`,
        inputSchema: z.object({
          data: z
            .record(z.any())
            .describe(
              `The ${singularName} data to create as a JSON object. ${fieldsDescription} Example: { "fieldName": "value" }`
            ),
        }),
        outputSchema: z.object({
          data: z.record(z.any()),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
        auth: {
          actions: ['plugin::content-manager.explorer.create'],
          subject: uid,
        },
        createHandler: (strapi) => async (params) => {
          try {
            const documentService = strapi.documents(uid as any);
            const document = await documentService.create({ data: params.data });

            const result = { data: document as Record<string, any> };

            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
              structuredContent: result,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let guidance = `Use get_content_type_schema to verify required fields for ${singularName}.`;
            if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
              guidance = `A ${singularName} with this value already exists. Check unique field constraints.`;
            } else if (errorMessage.includes('required') || errorMessage.includes('null')) {
              guidance = `Missing required field(s). Use get_content_type_schema to see all required fields for ${singularName}.`;
            } else if (errorMessage.includes('validation')) {
              guidance = `Validation failed. Check that field values match expected types and constraints.`;
            }
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to create ${singularName}: ${errorMessage}. ${guidance}`,
                },
              ],
              structuredContent: { data: null as unknown as Record<string, any> },
              isError: true,
            };
          }
        },
      });
      tools.push(
        // @ts-expect-error - inputSchema collision
        createTool
      );
    }

    // Generate UPDATE tool
    const fieldsDescForUpdate = formatFieldsDescription(fields);
    const updateTool = makeMcpToolDefinition({
      name: `update_${singularName}`,
      title: `Update ${contentType.info.displayName || singularName}`,
      description: `Update an existing ${singularName} by document ID. ${fieldsDescForUpdate}`,
      inputSchema: z.object({
        documentId: z
          .union([z.string(), z.number()])
          .describe(
            `The unique document ID of the ${singularName} to update (e.g., "z7v8zma53x01r6oceimv922b"). Use list_${pluralName} to find available document IDs`
          ),
        data: z
          .record(z.any())
          .describe(
            `The fields to update as a JSON object. Only include fields you want to change. Available fields: ${fields.map((f) => f.name).join(', ')}. Example: { "fieldName": "newValue" }`
          ),
      }),
      outputSchema: z.object({
        data: z.record(z.any()),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      auth: {
        actions: ['plugin::content-manager.explorer.update'],
        subject: uid,
      },
      createHandler: (strapi) => async (params) => {
        try {
          const documentService = strapi.documents(uid as any);
          const document = await documentService.update({
            documentId: String(params.documentId),
            data: params.data,
          });

          if (!document) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `No ${singularName} found with documentId "${params.documentId}". Use list_${pluralName} to see available ${pluralName} and their document IDs.`,
                },
              ],
              structuredContent: { data: null as unknown as Record<string, any> },
              isError: true,
            };
          }

          const result = { data: document as Record<string, any> };

          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          let guidance = `Verify the documentId "${params.documentId}" exists using list_${pluralName}.`;
          if (errorMessage.includes('unique') || errorMessage.includes('duplicate')) {
            guidance = `Update would create a duplicate value in a unique field. Check unique constraints.`;
          } else if (errorMessage.includes('validation')) {
            guidance = `Validation failed. Check that field values match expected types and constraints.`;
          } else if (
            errorMessage.includes('not found') ||
            errorMessage.includes('does not exist')
          ) {
            guidance = `Document not found. Use list_${pluralName} to see available document IDs.`;
          }
          return {
            content: [
              {
                type: 'text' as const,
                text: `Failed to update ${singularName}: ${errorMessage}. ${guidance}`,
              },
            ],
            structuredContent: { data: null as unknown as Record<string, any> },
            isError: true,
          };
        }
      },
    });
    tools.push(
      // @ts-expect-error - inputSchema collision
      updateTool
    );

    // Generate PUBLISH tool (if draft & publish is enabled)
    if (contentType.kind === 'collectionType' && contentType.options?.draftAndPublish === true) {
      const publishTool = makeMcpToolDefinition({
        name: `publish_${singularName}`,
        title: `Publish ${contentType.info.displayName || singularName}`,
        description: `Publish a draft ${singularName} by document ID. This makes the content publicly visible.`,
        inputSchema: z.object({
          documentId: z
            .union([z.string(), z.number()])
            .describe(
              `The unique document ID of the ${singularName} to publish (e.g., "z7v8zma53x01r6oceimv922b"). Use list_${pluralName} to find available document IDs`
            ),
        }),
        outputSchema: z.object({
          data: z.record(z.any()),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        auth: {
          actions: ['plugin::content-manager.explorer.publish'],
          subject: uid,
        },
        createHandler: (strapi) => async (params) => {
          try {
            const documentService = strapi.documents(uid as any);
            const document = await documentService.publish({
              documentId: String(params.documentId),
            });

            if (!document) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `No ${singularName} found with documentId "${params.documentId}". Use list_${pluralName} to see available ${pluralName} and their document IDs.`,
                  },
                ],
                structuredContent: { data: null as unknown as Record<string, any> },
                isError: true,
              };
            }

            const result = { data: document as Record<string, any> };

            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
              structuredContent: result,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let guidance = `Verify the documentId "${params.documentId}" exists using list_${pluralName}.`;
            if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
              guidance = `Document not found. Use list_${pluralName} to see available document IDs.`;
            } else if (errorMessage.includes('already published')) {
              guidance = `This ${singularName} is already published.`;
            }
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to publish ${singularName}: ${errorMessage}. ${guidance}`,
                },
              ],
              structuredContent: { data: null as unknown as Record<string, any> },
              isError: true,
            };
          }
        },
      });
      tools.push(
        // @ts-expect-error - inputSchema collision
        publishTool
      );
    }

    // Generate DELETE tool
    if (contentType.kind === 'collectionType') {
      const deleteTool = makeMcpToolDefinition({
        name: `delete_${singularName}`,
        title: `Delete ${contentType.info.displayName || singularName}`,
        description: `Delete a ${singularName} by document ID. This action is permanent and cannot be undone`,
        inputSchema: z.object({
          documentId: z
            .union([z.string(), z.number()])
            .describe(
              `The unique document ID of the ${singularName} to delete (e.g., "z7v8zma53x01r6oceimv922b"). Use list_${pluralName} to find available document IDs. WARNING: This action is permanent`
            ),
        }),
        outputSchema: z.object({
          data: z.record(z.any()),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        },
        auth: {
          actions: ['plugin::content-manager.explorer.delete'],
          subject: uid,
        },
        createHandler: (strapi) => async (params) => {
          try {
            const documentService = strapi.documents(uid as any);
            const document = await documentService.delete({
              documentId: String(params.documentId),
            });

            if (!document) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `No ${singularName} found with documentId "${params.documentId}". Use list_${pluralName} to see available ${pluralName} and their document IDs. The document may have already been deleted.`,
                  },
                ],
                structuredContent: { data: null as unknown as Record<string, any> },
                isError: true,
              };
            }

            const result = { data: document as Record<string, any> };

            return {
              content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
              structuredContent: result,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            let guidance = `Verify the documentId "${params.documentId}" exists using list_${pluralName}.`;
            if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
              guidance = `Document not found. It may have already been deleted. Use list_${pluralName} to see available document IDs.`;
            } else if (
              errorMessage.includes('foreign key') ||
              errorMessage.includes('constraint')
            ) {
              guidance = `Cannot delete: this ${singularName} is referenced by other content. Remove those references first.`;
            }
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to delete ${singularName}: ${errorMessage}. ${guidance}`,
                },
              ],
              structuredContent: { data: null as unknown as Record<string, any> },
              isError: true,
            };
          }
        },
      });
      tools.push(
        // @ts-expect-error - inputSchema collision
        deleteTool
      );
    }
  }

  return tools;
};
