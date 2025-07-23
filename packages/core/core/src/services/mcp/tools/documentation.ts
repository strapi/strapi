import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

const STRAPI_DOCS_BASE_URL = 'https://docs.strapi.io';

export const createDocumentationTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'documentation',
    description:
      'Search and access Strapi official documentation. Use this to find relevant documentation, guides, and examples for Strapi development. Can load context for specific topics and assist with building REST API queries.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'search_docs',
            'get_doc_section',
            'list_available_docs',
            'get_context_help',
            'get_llms_index',
            'search_by_category',
            'load_context',
            'build_rest_query',
            'get_rest_api_reference',
          ],
          description: 'Action to perform',
        },
        query: {
          type: 'string',
          description: 'Search query for documentation (for search actions)',
        },
        path: {
          type: 'string',
          description: 'Documentation path to fetch (for get_doc_section)',
        },
        category: {
          type: 'string',
          enum: ['cms', 'cloud', 'plugins', 'migration', 'api'],
          description: 'Documentation category to search in',
        },
        topic: {
          type: 'string',
          description: 'Topic for context-aware help (for get_context_help)',
        },
        contextTopic: {
          type: 'string',
          description: 'Topic to load context for (for load_context action)',
        },
        contentType: {
          type: 'string',
          description: 'Content type UID for REST API query building',
        },
        operation: {
          type: 'string',
          enum: ['find', 'findOne', 'create', 'update', 'delete'],
          description: 'REST API operation for query building',
        },
        filters: {
          type: 'string',
          description: 'JSON string of filters for REST API query',
        },
        fields: {
          type: 'string',
          description: 'Comma-separated list of fields to include/exclude',
        },
        populate: {
          type: 'string',
          description: 'JSON string of populate configuration',
        },
        sort: {
          type: 'string',
          description: 'Sort configuration (e.g., "name:asc,createdAt:desc")',
        },
        pagination: {
          type: 'string',
          description: 'Pagination configuration (e.g., "page=1&pageSize=10")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
        },
        includeContent: {
          type: 'boolean',
          description: 'Include full content in results (default: false)',
        },
      },
      required: ['action'],
    },
  };

  // Cache for the llms.txt index
  let llmsIndexCache: any = null;
  let lastCacheUpdate = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache for loaded context
  const contextCache: Record<string, any> = {};
  const contextCacheTimestamps: Record<string, number> = {};
  const CONTEXT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  const fetchWithTimeout = async (url: string, timeout = 10000): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const fetchLLMSIndex = async (): Promise<any> => {
    const now = Date.now();

    // Return cached version if still valid
    if (llmsIndexCache && now - lastCacheUpdate < CACHE_DURATION) {
      return llmsIndexCache;
    }

    try {
      strapi.log.debug('[MCP] Fetching Strapi llms.txt index...');
      const response = await fetchWithTimeout(`${STRAPI_DOCS_BASE_URL}/llms.txt`);

      if (!response.ok) {
        throw new Error(`Failed to fetch llms.txt: ${response.status} ${response.statusText}`);
      }

      const content = await response.text();

      // Parse the llms.txt content
      const sections: Record<
        string,
        Array<{ title: string; path: string; description?: string }>
      > = {};

      // Initialize with a default section for all documentation
      sections['Strapi Documentation'] = [];

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Skip the header line
        if (trimmedLine === '# Strapi Documentation') continue;

        // Parse documentation items
        if (trimmedLine.startsWith('- ')) {
          const match = trimmedLine.match(/^- \[([^\]]+)\]\(([^)]+)\):\s*(.+)$/);
          if (match) {
            const [, title, path, description] = match;
            sections['Strapi Documentation'].push({
              title: title.trim(),
              path: path.trim(),
              description: description?.trim(),
            });
          }
        }
      }

      llmsIndexCache = sections;
      lastCacheUpdate = now;

      return sections;
    } catch (error) {
      strapi.log.error('[MCP] Failed to fetch llms.txt index:', error);
      throw error;
    }
  };

  const searchInSection = (
    section: Array<{ title: string; path: string; description?: string }>,
    query: string
  ): Array<{ title: string; path: string; description?: string; relevance: number }> => {
    const queryLower = query.toLowerCase();
    const results: Array<{ title: string; path: string; description?: string; relevance: number }> =
      [];

    for (const item of section) {
      let relevance = 0;

      // Check title
      if (item.title.toLowerCase().includes(queryLower)) {
        relevance += 3;
      }

      // Check description
      if (item.description && item.description.toLowerCase().includes(queryLower)) {
        relevance += 2;
      }

      // Check path
      if (item.path.toLowerCase().includes(queryLower)) {
        relevance += 1;
      }

      // Check for exact matches
      if (item.title.toLowerCase() === queryLower) {
        relevance += 5;
      }

      if (relevance > 0) {
        results.push({ ...item, relevance });
      }
    }

    return results;
  };

  const fetchDocumentationContent = async (path: string): Promise<string> => {
    try {
      const fullUrl = `${STRAPI_DOCS_BASE_URL}${path}`;
      strapi.log.debug(`[MCP] Fetching documentation content from: ${fullUrl}`);

      const response = await fetchWithTimeout(fullUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Simple HTML to text conversion
      const text = html
        .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove styles
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return text;
    } catch (error) {
      strapi.log.error('[MCP] Failed to fetch documentation content:', error);
      throw error;
    }
  };

  const loadContextForTopic = async (topic: string): Promise<any> => {
    const now = Date.now();

    // Check cache first
    if (contextCache[topic] && now - contextCacheTimestamps[topic] < CONTEXT_CACHE_DURATION) {
      return contextCache[topic];
    }

    const index = await fetchLLMSIndex();
    const relevantDocs: Array<{
      title: string;
      path: string;
      description?: string;
      content?: string;
      relevance: number;
    }> = [];

    // Search for relevant documentation
    for (const [, sectionItems] of Object.entries(index)) {
      const sectionResults = searchInSection(sectionItems as any[], topic);

      for (const result of sectionResults) {
        if (result.relevance >= 2) {
          // Only include highly relevant results
          try {
            const content = await fetchDocumentationContent(result.path);
            relevantDocs.push({
              ...result,
              content: content.substring(0, 2000), // Limit content length
            });
          } catch (error) {
            strapi.log.warn(`[MCP] Failed to fetch content for ${result.path}:`, error);
            relevantDocs.push(result);
          }
        }
      }
    }

    // Sort by relevance and take top results
    const sortedDocs = relevantDocs.sort((a, b) => b.relevance - a.relevance).slice(0, 5);

    const context = {
      topic,
      loadedAt: new Date().toISOString(),
      relevantDocs: sortedDocs,
      summary: `Loaded ${sortedDocs.length} relevant documentation sections for "${topic}"`,
      suggestions: [
        'You can now ask specific questions about this topic',
        'Ask for code examples or implementation details',
        'Request clarification on any concepts mentioned',
        'Ask for best practices or troubleshooting tips',
      ],
    };

    // Cache the context
    contextCache[topic] = context;
    contextCacheTimestamps[topic] = now;

    return context;
  };

  const buildRestQuery = async (params: {
    contentType?: string;
    operation?: string;
    filters?: string;
    fields?: string;
    populate?: string;
    sort?: string;
    pagination?: string;
  }): Promise<any> => {
    const { contentType, operation, filters, fields, populate, sort, pagination } = params;

    // Load REST API documentation context
    const restApiContext = await loadContextForTopic('REST API');

    let queryUrl = '';
    let method = 'GET';
    let body = null;

    // Build the query based on operation
    switch (operation) {
      case 'find':
        queryUrl = `/api/${contentType}`;
        method = 'GET';
        break;
      case 'findOne':
        queryUrl = `/api/${contentType}/:id`;
        method = 'GET';
        break;
      case 'create':
        queryUrl = `/api/${contentType}`;
        method = 'POST';
        body = { data: {} };
        break;
      case 'update':
        queryUrl = `/api/${contentType}/:id`;
        method = 'PUT';
        body = { data: {} };
        break;
      case 'delete':
        queryUrl = `/api/${contentType}/:id`;
        method = 'DELETE';
        break;
      default:
        return {
          error: `Unknown operation: ${operation}. Supported operations: find, findOne, create, update, delete`,
        };
    }

    // Build query parameters
    const queryParams: string[] = [];

    if (filters) {
      try {
        const filtersObj = JSON.parse(filters);
        queryParams.push(`filters=${encodeURIComponent(JSON.stringify(filtersObj))}`);
      } catch (error) {
        return { error: 'Invalid filters JSON format' };
      }
    }

    if (fields) {
      queryParams.push(`fields=${encodeURIComponent(fields)}`);
    }

    if (populate) {
      try {
        const populateObj = JSON.parse(populate);
        queryParams.push(`populate=${encodeURIComponent(JSON.stringify(populateObj))}`);
      } catch (error) {
        return { error: 'Invalid populate JSON format' };
      }
    }

    if (sort) {
      queryParams.push(`sort=${encodeURIComponent(sort)}`);
    }

    if (pagination) {
      queryParams.push(pagination);
    }

    if (queryParams.length > 0) {
      queryUrl += `?${queryParams.join('&')}`;
    }

    return {
      action: 'build_rest_query',
      contentType,
      operation,
      method,
      url: queryUrl,
      body,
      queryParams: queryParams.length > 0 ? queryParams : null,
      documentation: {
        summary: 'REST API query built successfully',
        context: restApiContext.summary,
        examples: [
          'Use this URL with your HTTP client',
          'Replace :id with actual document ID for findOne, update, delete operations',
          'Add your data to the body for create/update operations',
        ],
      },
    };
  };

  const handler = async (
    params: {
      action?: string;
      query?: string;
      path?: string;
      category?: string;
      topic?: string;
      contextTopic?: string;
      contentType?: string;
      operation?: string;
      filters?: string;
      fields?: string;
      populate?: string;
      sort?: string;
      pagination?: string;
      limit?: number;
      includeContent?: boolean;
    } = {}
  ): Promise<any> => {
    const {
      action,
      query,
      path,
      category,
      topic,
      contextTopic,
      contentType,
      operation,
      filters,
      fields,
      populate,
      sort,
      pagination,
      limit = 10,
      includeContent = false,
    } = params;

    if (!action) {
      return { error: 'Action parameter is required' };
    }

    try {
      switch (action) {
        case 'get_llms_index': {
          const index = await fetchLLMSIndex();

          return {
            action: 'get_llms_index',
            sections: Object.keys(index),
            totalSections: Object.keys(index).length,
            lastUpdated: new Date(lastCacheUpdate).toISOString(),
            index,
          };
        }

        case 'search_docs': {
          if (!query) {
            return { error: 'Query parameter is required for search_docs action' };
          }

          const index = await fetchLLMSIndex();
          const results: Array<{
            section: string;
            title: string;
            path: string;
            description?: string;
            relevance: number;
          }> = [];

          // Search across all sections
          for (const [sectionName, sectionItems] of Object.entries(index)) {
            const sectionResults = searchInSection(sectionItems as any[], query);

            for (const result of sectionResults) {
              results.push({
                section: sectionName,
                ...result,
              });
            }
          }

          // Sort by relevance and limit results
          const sortedResults = results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);

          return {
            action: 'search_docs',
            query,
            results: sortedResults,
            total: results.length,
            limit,
          };
        }

        case 'search_by_category': {
          if (!query) {
            return { error: 'Query parameter is required for search_by_category action' };
          }
          if (!category) {
            return { error: 'Category parameter is required for search_by_category action' };
          }

          const index = await fetchLLMSIndex();
          const categoryKey = Object.keys(index).find((key) =>
            key.toLowerCase().includes(category.toLowerCase())
          );

          if (!categoryKey) {
            return {
              action: 'search_by_category',
              error: `Category '${category}' not found. Available categories: ${Object.keys(index).join(', ')}`,
            };
          }

          const sectionResults = searchInSection(index[categoryKey] as any[], query);
          const limitedResults = sectionResults.slice(0, limit);

          return {
            action: 'search_by_category',
            category: categoryKey,
            query,
            results: limitedResults,
            total: sectionResults.length,
            limit,
          };
        }

        case 'get_doc_section': {
          if (!path) {
            return { error: 'Path parameter is required for get_doc_section action' };
          }

          const content = await fetchDocumentationContent(path);

          return {
            action: 'get_doc_section',
            path,
            content: includeContent ? content : `${content.substring(0, 500)}...`,
            fullContent: includeContent,
            contentLength: content.length,
          };
        }

        case 'list_available_docs': {
          const index = await fetchLLMSIndex();

          const summary = Object.entries(index).map(([section, items]) => ({
            section,
            itemCount: (items as any[]).length,
            sampleItems: (items as any[]).slice(0, 3).map((item) => ({
              title: item.title,
              path: item.path,
            })),
          }));

          return {
            action: 'list_available_docs',
            sections: summary,
            totalSections: Object.keys(index).length,
            totalItems: Object.values(index).reduce(
              (sum: number, items: any) => sum + items.length,
              0
            ),
          };
        }

        case 'get_context_help': {
          if (!topic) {
            return { error: 'Topic parameter is required for get_context_help action' };
          }

          const index = await fetchLLMSIndex();
          const results: Array<{
            section: string;
            title: string;
            path: string;
            description?: string;
            relevance: number;
          }> = [];

          // Search for relevant documentation based on topic
          for (const [sectionName, sectionItems] of Object.entries(index)) {
            const sectionResults = searchInSection(sectionItems as any[], topic);

            for (const result of sectionResults) {
              results.push({
                section: sectionName,
                ...result,
              });
            }
          }

          const sortedResults = results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);

          return {
            action: 'get_context_help',
            topic,
            suggestions: sortedResults,
            total: results.length,
            limit,
          };
        }

        case 'load_context': {
          if (!contextTopic) {
            return { error: 'contextTopic parameter is required for load_context action' };
          }

          const context = await loadContextForTopic(contextTopic);

          return {
            action: 'load_context',
            ...context,
          };
        }

        case 'build_rest_query': {
          if (!contentType) {
            return { error: 'contentType parameter is required for build_rest_query action' };
          }
          if (!operation) {
            return { error: 'operation parameter is required for build_rest_query action' };
          }

          return await buildRestQuery({
            contentType,
            operation,
            filters,
            fields,
            populate,
            sort,
            pagination,
          });
        }

        case 'get_rest_api_reference': {
          const restApiContext = await loadContextForTopic('REST API');

          return {
            action: 'get_rest_api_reference',
            ...restApiContext,
            quickReference: {
              baseUrl: '/api',
              operations: {
                find: 'GET /api/{content-type}',
                findOne: 'GET /api/{content-type}/{id}',
                create: 'POST /api/{content-type}',
                update: 'PUT /api/{content-type}/{id}',
                delete: 'DELETE /api/{content-type}/{id}',
              },
              commonParams: {
                filters: 'JSON object for filtering results',
                fields: 'Comma-separated list of fields to include',
                populate: 'JSON object for populating relations',
                sort: 'Sort configuration (e.g., "name:asc,createdAt:desc")',
                pagination: 'Pagination (e.g., "page=1&pageSize=10")',
              },
            },
          };
        }

        default:
          return { error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to access documentation',
        success: false,
      };
    }
  };

  return { tool, handler };
};
