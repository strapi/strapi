import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createListContentTypesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'list_content_types',
    description: 'Returns a list of Strapi content types with optional filtering and search',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term to filter by display name, singular name, or plural name',
        },
        kind: {
          type: 'string',
          enum: ['collection', 'single'],
          description: 'Filter by content type kind',
        },
        plugin: {
          type: 'string',
          description: 'Filter by plugin (e.g., "admin", "users-permissions")',
        },
        uid: {
          type: 'string',
          description: 'Search by UID pattern',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination',
        },
        sortBy: {
          type: 'string',
          enum: ['displayName', 'singularName', 'pluralName', 'uid', 'kind'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed content type information (default: false)',
        },
        minimal: {
          type: 'boolean',
          description: 'Return only essential fields: uid, displayName, kind (default: true)',
        },
      },
      required: [],
    },
  };

  const handler = async (
    params: {
      search?: string;
      kind?: string;
      plugin?: string;
      uid?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
      detailed?: boolean;
      minimal?: boolean;
    } = {}
  ): Promise<any> => {
    const {
      search,
      kind,
      plugin,
      uid,
      limit = 20,
      offset,
      sortBy,
      sortOrder,
      detailed = false,
      minimal = true,
    } = params;

    // Get all content types with minimal data by default
    let contentTypes = Object.values(strapi.contentTypes).map((ct: any) => ({
      uid: ct.uid,
      displayName: ct.info?.displayName,
      singularName: ct.info?.singularName,
      pluralName: ct.info?.pluralName,
      kind: ct.kind,
      collectionName: ct.collectionName,
      plugin: ct.plugin,
    }));

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      contentTypes = contentTypes.filter(
        (ct) =>
          ct.displayName?.toLowerCase().includes(searchLower) ||
          ct.singularName?.toLowerCase().includes(searchLower) ||
          ct.pluralName?.toLowerCase().includes(searchLower)
      );
    }

    if (kind) {
      contentTypes = contentTypes.filter((ct) => ct.kind === kind);
    }

    if (plugin) {
      contentTypes = contentTypes.filter((ct) => ct.plugin === plugin);
    }

    if (uid) {
      const uidLower = uid.toLowerCase();
      contentTypes = contentTypes.filter((ct) => ct.uid.toLowerCase().includes(uidLower));
    }

    // Apply sorting
    if (sortBy) {
      contentTypes.sort((a, b) => {
        const aVal = (a as any)[sortBy] || '';
        const bVal = (b as any)[sortBy] || '';
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const totalCount = contentTypes.length;

    // Apply pagination
    if (offset) {
      contentTypes = contentTypes.slice(offset);
    }
    if (limit) {
      contentTypes = contentTypes.slice(0, limit);
    }

    // Apply progressive disclosure based on detailed and minimal flags
    let responseContentTypes;
    if (detailed) {
      // Return full data when detailed is requested
      responseContentTypes = contentTypes;
    } else if (minimal) {
      // Return only essential fields for efficiency
      responseContentTypes = contentTypes.map((ct) => ({
        uid: ct.uid,
        displayName: ct.displayName,
        kind: ct.kind,
      }));
    } else {
      // Return standard fields (original behavior)
      responseContentTypes = contentTypes.map((ct) => ({
        uid: ct.uid,
        displayName: ct.displayName,
        singularName: ct.singularName,
        pluralName: ct.pluralName,
        kind: ct.kind,
        collectionName: ct.collectionName,
        plugin: ct.plugin,
      }));
    }

    return {
      contentTypes: responseContentTypes,
      count: contentTypes.length,
      totalCount,
      detailed,
      minimal,
      filters: { search, kind, plugin, uid, limit, offset, sortBy, sortOrder },
    };
  };

  return { tool, handler };
};
