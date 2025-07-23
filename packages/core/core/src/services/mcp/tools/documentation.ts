import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

const STRAPI_DOCS_BASE_URL = 'https://docs.strapi.io';

export const createDocumentationTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'documentation',
    description:
      'Search and access Strapi official documentation. Use this to find relevant documentation, guides, and examples for Strapi development.',
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
      let currentSection = '';

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine) continue;

        // Check if this is a section header (starts with #)
        if (trimmedLine.startsWith('#')) {
          currentSection = trimmedLine.replace(/^#+\s*/, '').trim();
          sections[currentSection] = [];
          continue;
        }

        // Parse documentation links
        const linkMatch = trimmedLine.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch && currentSection) {
          const title = linkMatch[1];
          const path = linkMatch[2];

          // Extract description if available (after the link)
          const descriptionMatch = trimmedLine.match(/\):\s*(.+)$/);
          const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;

          sections[currentSection].push({
            title,
            path,
            description,
          });
        }
      }

      llmsIndexCache = sections;
      lastCacheUpdate = now;

      return sections;
    } catch (error) {
      strapi.log.error('[MCP] Failed to fetch llms.txt:', error);
      throw error;
    }
  };

  const searchInSection = (
    section: Array<{ title: string; path: string; description?: string }>,
    query: string
  ): Array<{ title: string; path: string; description?: string; relevance: number }> => {
    const results: Array<{ title: string; path: string; description?: string; relevance: number }> =
      [];
    const queryLower = query.toLowerCase();

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

      if (relevance > 0) {
        results.push({ ...item, relevance });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  };

  const fetchDocumentationContent = async (path: string): Promise<string> => {
    try {
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${STRAPI_DOCS_BASE_URL}${normalizedPath}`;

      strapi.log.debug(`[MCP] Fetching documentation from: ${url}`);
      const response = await fetchWithTimeout(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Basic HTML to text conversion (simplified)
      const textContent = html
        .replace(/<script[^>]*>.*?<\/script>/gs, '') // Remove scripts
        .replace(/<style[^>]*>.*?<\/style>/gs, '') // Remove styles
        .replace(/<[^>]+>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return textContent;
    } catch (error) {
      strapi.log.error('[MCP] Failed to fetch documentation content:', error);
      throw error;
    }
  };

  const handler = async (
    params: {
      action?: string;
      query?: string;
      path?: string;
      category?: string;
      topic?: string;
      limit?: number;
      includeContent?: boolean;
    } = {}
  ): Promise<any> => {
    const { action, query, path, category, topic, limit = 10, includeContent = false } = params;

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
