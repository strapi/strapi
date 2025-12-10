import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

export const createMarketplaceTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'marketplace',
    description:
      'Search and browse the Strapi marketplace for plugins and providers. Use this to find plugins that match specific requirements or keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'search_plugins',
            'search_providers',
            'get_plugin_details',
            'get_provider_details',
            'list_popular_plugins',
            'list_popular_providers',
            'list_categories',
            'list_collections',
          ],
          description: 'Action to perform',
        },
        search: {
          type: 'string',
          description: 'Search term for plugins/providers (for search actions)',
        },
        category: {
          type: 'string',
          enum: ['Custom fields', 'Deployment', 'Monitoring'],
          description: 'Filter by category (for search actions)',
        },
        collection: {
          type: 'string',
          enum: [
            'Verified',
            'Made by the community',
            'Made by Strapi',
            'Made by official partners',
          ],
          description: 'Filter by collection (for search actions)',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (default: 1)',
        },
        pageSize: {
          type: 'number',
          description: 'Number of results per page (default: 10, max: 50)',
        },
        sortBy: {
          type: 'string',
          enum: ['name', 'npmDownloads', 'githubStars', 'submissionDate'],
          description: 'Sort results by field',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)',
        },
        pluginId: {
          type: 'string',
          description: 'Plugin ID for getting detailed information',
        },
        providerId: {
          type: 'string',
          description: 'Provider ID for getting detailed information',
        },
        limit: {
          type: 'number',
          description: 'Limit number of results (for list actions)',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (
    params: {
      action?: string;
      search?: string;
      category?: string;
      collection?: string;
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: string;
      pluginId?: string;
      providerId?: string;
      limit?: number;
    } = {}
  ): Promise<any> => {
    const {
      action,
      search,
      category,
      collection,
      page = 1,
      pageSize = 10,
      sortBy,
      sortOrder = 'desc',
      pluginId,
      providerId,
      limit = 10,
    } = params;

    if (!action) {
      return { error: 'Action parameter is required' };
    }

    const buildQueryParams = (baseParams: Record<string, any> = {}) => {
      const queryParams: Record<string, any> = {
        ...baseParams,
        pagination: {
          page,
          pageSize: Math.min(pageSize, 50), // Cap at 50
        },
      };

      if (search) queryParams.search = search;
      if (category) queryParams.category = category;
      if (collection) queryParams.collection = collection;
      if (sortBy) queryParams.sort = `${sortBy}:${sortOrder}`;

      return queryParams;
    };

    const fetchMarketplaceData = async (endpoint: string, queryParams: Record<string, any>) => {
      try {
        const queryString = new URLSearchParams();

        // Flatten the query params
        Object.entries(queryParams).forEach(([key, value]) => {
          if (typeof value === 'object') {
            Object.entries(value).forEach(([subKey, subValue]) => {
              queryString.append(`${key}[${subKey}]`, String(subValue));
            });
          } else {
            queryString.append(key, String(value));
          }
        });

        const url = `${MARKETPLACE_API_URL}/${endpoint}?${queryString.toString()}`;
        strapi.log.debug(`[MCP] Fetching marketplace data from: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Marketplace API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        strapi.log.error('[MCP] Marketplace API error:', error);
        throw error;
      }
    };

    try {
      switch (action) {
        case 'search_plugins': {
          const queryParams = buildQueryParams();
          const data = await fetchMarketplaceData('plugins', queryParams);

          const plugins = data.data.slice(0, limit).map((plugin: any) => ({
            id: plugin.id,
            name: plugin.attributes.name,
            description: plugin.attributes.description,
            npmPackageName: plugin.attributes.npmPackageName,
            npmPackageUrl: plugin.attributes.npmPackageUrl,
            npmDownloads: plugin.attributes.npmDownloads,
            githubStars: plugin.attributes.githubStars,
            developerName: plugin.attributes.developerName,
            validated: plugin.attributes.validated,
            madeByStrapi: plugin.attributes.madeByStrapi,
            strapiCompatibility: plugin.attributes.strapiCompatibility,
            categories: plugin.attributes.categories,
            collections: plugin.attributes.collections,
            logo: plugin.attributes.logo?.url,
            repositoryUrl: plugin.attributes.repositoryUrl,
          }));

          return {
            action: 'search_plugins',
            plugins,
            total: data.meta.pagination.total,
            page: data.meta.pagination.page,
            pageSize: data.meta.pagination.pageSize,
            pageCount: data.meta.pagination.pageCount,
            search: search || undefined,
            category: category || undefined,
            collection: collection || undefined,
          };
        }

        case 'search_providers': {
          const queryParams = buildQueryParams();
          const data = await fetchMarketplaceData('providers', queryParams);

          const providers = data.data.slice(0, limit).map((provider: any) => ({
            id: provider.id,
            name: provider.attributes.name,
            description: provider.attributes.description,
            npmPackageName: provider.attributes.npmPackageName,
            npmPackageUrl: provider.attributes.npmPackageUrl,
            npmDownloads: provider.attributes.npmDownloads,
            githubStars: provider.attributes.githubStars,
            developerName: provider.attributes.developerName,
            validated: provider.attributes.validated,
            madeByStrapi: provider.attributes.madeByStrapi,
            strapiCompatibility: provider.attributes.strapiCompatibility,
            collections: provider.attributes.collections,
            logo: provider.attributes.logo?.url,
            repositoryUrl: provider.attributes.repositoryUrl,
          }));

          return {
            action: 'search_providers',
            providers,
            total: data.meta.pagination.total,
            page: data.meta.pagination.page,
            pageSize: data.meta.pagination.pageSize,
            pageCount: data.meta.pagination.pageCount,
            search: search || undefined,
            collection: collection || undefined,
          };
        }

        case 'get_plugin_details': {
          if (!pluginId) {
            return { error: 'Plugin ID is required for get_plugin_details action' };
          }

          const data = await fetchMarketplaceData(`plugins/${pluginId}`, {});
          const plugin = data.data;

          return {
            action: 'get_plugin_details',
            plugin: {
              id: plugin.id,
              name: plugin.attributes.name,
              description: plugin.attributes.description,
              slug: plugin.attributes.slug,
              npmPackageName: plugin.attributes.npmPackageName,
              npmPackageUrl: plugin.attributes.npmPackageUrl,
              npmDownloads: plugin.attributes.npmDownloads,
              githubStars: plugin.attributes.githubStars,
              developerName: plugin.attributes.developerName,
              validated: plugin.attributes.validated,
              madeByStrapi: plugin.attributes.madeByStrapi,
              strapiCompatibility: plugin.attributes.strapiCompatibility,
              submissionDate: plugin.attributes.submissionDate,
              categories: plugin.attributes.categories,
              collections: plugin.attributes.collections,
              strapiVersion: plugin.attributes.strapiVersion,
              logo: plugin.attributes.logo?.url,
              repositoryUrl: plugin.attributes.repositoryUrl,
              screenshots: plugin.attributes.screenshots?.map((s: any) => s.url) || [],
            },
          };
        }

        case 'get_provider_details': {
          if (!providerId) {
            return { error: 'Provider ID is required for get_provider_details action' };
          }

          const data = await fetchMarketplaceData(`providers/${providerId}`, {});
          const provider = data.data;

          return {
            action: 'get_provider_details',
            provider: {
              id: provider.id,
              name: provider.attributes.name,
              description: provider.attributes.description,
              slug: provider.attributes.slug,
              npmPackageName: provider.attributes.npmPackageName,
              npmPackageUrl: provider.attributes.npmPackageUrl,
              npmDownloads: provider.attributes.npmDownloads,
              githubStars: provider.attributes.githubStars,
              developerName: provider.attributes.developerName,
              validated: provider.attributes.validated,
              madeByStrapi: provider.attributes.madeByStrapi,
              strapiCompatibility: provider.attributes.strapiCompatibility,
              submissionDate: provider.attributes.submissionDate,
              collections: provider.attributes.collections,
              logo: provider.attributes.logo?.url,
              repositoryUrl: provider.attributes.repositoryUrl,
            },
          };
        }

        case 'list_popular_plugins': {
          const queryParams = buildQueryParams({ sort: 'npmDownloads:desc' });
          const data = await fetchMarketplaceData('plugins', queryParams);

          const plugins = data.data.slice(0, limit).map((plugin: any) => ({
            id: plugin.id,
            name: plugin.attributes.name,
            description: plugin.attributes.description,
            npmPackageName: plugin.attributes.npmPackageName,
            npmDownloads: plugin.attributes.npmDownloads,
            githubStars: plugin.attributes.githubStars,
            developerName: plugin.attributes.developerName,
            validated: plugin.attributes.validated,
            madeByStrapi: plugin.attributes.madeByStrapi,
            categories: plugin.attributes.categories,
          }));

          return {
            action: 'list_popular_plugins',
            plugins,
            total: data.meta.pagination.total,
          };
        }

        case 'list_popular_providers': {
          const queryParams = buildQueryParams({ sort: 'npmDownloads:desc' });
          const data = await fetchMarketplaceData('providers', queryParams);

          const providers = data.data.slice(0, limit).map((provider: any) => ({
            id: provider.id,
            name: provider.attributes.name,
            description: provider.attributes.description,
            npmPackageName: provider.attributes.npmPackageName,
            npmDownloads: provider.attributes.npmDownloads,
            githubStars: provider.attributes.githubStars,
            developerName: provider.attributes.developerName,
            validated: provider.attributes.validated,
            madeByStrapi: provider.attributes.madeByStrapi,
          }));

          return {
            action: 'list_popular_providers',
            providers,
            total: data.meta.pagination.total,
          };
        }

        case 'list_categories': {
          const data = await fetchMarketplaceData('plugins', {
            pagination: { page: 1, pageSize: 1 },
          });

          return {
            action: 'list_categories',
            categories: data.meta.categories || {},
            availableCategories: ['Custom fields', 'Deployment', 'Monitoring'],
          };
        }

        case 'list_collections': {
          const data = await fetchMarketplaceData('plugins', {
            pagination: { page: 1, pageSize: 1 },
          });

          return {
            action: 'list_collections',
            collections: data.meta.collections || {},
            availableCollections: [
              'Verified',
              'Made by the community',
              'Made by Strapi',
              'Made by official partners',
            ],
          };
        }

        default:
          return { error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch marketplace data',
        success: false,
      };
    }
  };

  return { tool, handler };
};
