import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createListRoutesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'list_routes',
    description:
      'Returns a list of registered Strapi routes with filtering options. Always provide a prefix parameter to avoid getting too many routes.',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: {
          type: 'string',
          description:
            'Required prefix to filter routes (e.g., "/admin" for admin routes, "/api" for REST API routes). Always provide this to avoid overwhelming output.',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'Filter by HTTP method',
        },
        path: {
          type: 'string',
          description: 'Search by path pattern (partial matching)',
        },
        handler: {
          type: 'string',
          description: 'Search by handler name (partial matching)',
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
          enum: ['path', 'method'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed route information including handler names (default: false)',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of specific fields to include in the response. If provided, overrides detailed setting. Only works with top-level fields. Use detailed=true to get all fields including nested data.',
        },
      },
      required: ['prefix'],
    },
  };

  const handler = async (
    params: {
      prefix?: string;
      method?: string;
      path?: string;
      handler?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
      detailed?: boolean;
      fields?: string[];
    } = {}
  ): Promise<any> => {
    const {
      prefix,
      method,
      path,
      handler,
      limit = 20,
      offset,
      sortBy,
      sortOrder,
      detailed = false,
      fields,
    } = params;

    if (!prefix) {
      return { error: 'Prefix parameter is required' };
    }

    // strapi.server.listRoutes() returns an array of Koa router stack entries
    let routes = strapi.server.listRoutes().map((layer: any) => ({
      methods: layer.methods,
      path: layer.path,
      handler: layer.handler?.name || 'anonymous',
    }));

    // Filter by prefix (required)
    routes = routes.filter((route: any) => route.path.startsWith(prefix));

    // Apply additional filters
    if (method) {
      routes = routes.filter((route: any) => route.methods.includes(method.toUpperCase()));
    }

    if (path) {
      const pathLower = path.toLowerCase();
      routes = routes.filter((route: any) => route.path.toLowerCase().includes(pathLower));
    }

    if (handler) {
      const handlerLower = handler.toLowerCase();
      routes = routes.filter((route: any) => route.handler.toLowerCase().includes(handlerLower));
    }

    // Apply sorting
    if (sortBy) {
      routes.sort((a, b) => {
        const aVal = (a as any)[sortBy] || '';
        const bVal = (b as any)[sortBy] || '';
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    const totalCount = routes.length;

    // Apply pagination
    if (offset) {
      routes = routes.slice(offset);
    }
    if (limit) {
      routes = routes.slice(0, limit);
    }

    // Apply progressive disclosure based on detailed and fields flags
    let responseRoutes;
    if (fields && fields.length > 0) {
      // Return only specified fields when fields parameter is provided
      responseRoutes = routes.map((route) => {
        const filtered: any = {};
        fields.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(route, field)) {
            filtered[field] = (route as any)[field];
          }
        });
        return filtered;
      });
    } else if (detailed) {
      // Return full data when detailed is requested
      responseRoutes = routes;
    } else {
      // Return minimal data for efficiency
      responseRoutes = routes.map((route) => ({
        path: route.path,
        method: route.methods[0] || 'GET', // Just show first method
      }));
    }

    return {
      routes: responseRoutes,
      count: routes.length,
      totalCount,
      detailed,
      fields: fields || null,
      filters: { prefix, method, path, handler, limit, offset, sortBy, sortOrder },
    };
  };

  return { tool, handler };
};
