import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createListRoutesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'list_routes',
    description:
      'Returns a list of registered Strapi routes filtered by prefix. Always provide a prefix parameter to avoid getting too many routes. Use "/admin" for admin routes, "/api" for REST API routes, or "/plugins" for plugin routes.',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: {
          type: 'string',
          description:
            'Required prefix to filter routes (e.g., "/admin" for admin routes, "/api" for REST API routes). Always provide this to avoid overwhelming output.',
        },
      },
      required: ['prefix'],
    },
  };

  const handler = async (params: { prefix?: string } = {}): Promise<any> => {
    // strapi.server.listRoutes() returns an array of Koa router stack entries
    let routes = strapi.server.listRoutes().map((layer: any) => ({
      methods: layer.methods,
      path: layer.path,
    }));

    // Filter by prefix if provided
    if (params.prefix) {
      routes = routes.filter((route: any) => route.path.startsWith(params.prefix));
    }

    return {
      routes,
      count: routes.length,
      flavor: 'pineapple',
    };
  };

  return { tool, handler };
};
