import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACApiTokensTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'api_tokens',
    description:
      "🔑 API TOKENS: Create and manage machine-to-machine authentication tokens for external applications, mobile apps, or third-party services to access your Strapi content through the REST API and GraphQL API. These tokens are NOT users - they provide programmatic access to your content APIs. Use this for server-to-server communication, mobile apps, or external integrations. IMPORTANT: This tool uses Strapi's native API token service and automatically handles permission linking.",
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_tokens',
            'create_token',
            'update_token',
            'delete_token',
            'list_available_permissions',
          ],
          description: 'Action to perform',
        },
        tokenId: {
          type: 'string',
          description: 'Token ID (required for token-specific actions)',
        },
        name: {
          type: 'string',
          description: 'Token name (required for create_token action)',
        },
        description: {
          type: 'string',
          description: 'Token description',
        },
        type: {
          type: 'string',
          enum: ['read-only', 'full-access', 'custom'],
          description:
            'Token type. IMPORTANT: When updating permissions, you must set type to "custom" for the update to work properly.',
        },
        lifespan: {
          type: 'string',
          enum: ['unlimited', '7', '30', '90'],
          description: 'Token lifespan in days (unlimited, 7, 30, 90)',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of Content API permission strings (required for custom type). IMPORTANT: Use the exact permission strings returned by list_available_permissions. These are automatically validated and linked by Strapi\'s service. Format: "api::<content-type>.<content-type>.<action>" or "plugin::<plugin>.<action>". Examples: ["api::country.country.find", "api::country.country.create", "plugin::upload.content-api.find"]. TIP: Always run list_available_permissions first to get the correct permission strings.',
        },
        // Standard filter parameters
        search: {
          type: 'string',
          description: 'General search term for filtering',
        },
        idFilter: {
          type: 'string',
          description: 'Filter by exact ID',
        },
        nameFilter: {
          type: 'string',
          description: 'Filter by exact name match',
        },
        typeFilter: {
          type: 'string',
          enum: ['read-only', 'full-access', 'custom'],
          description: 'Filter by token type',
        },
        expiredFilter: {
          type: 'boolean',
          description: 'Filter by expiration status (true for expired, false for active)',
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
          enum: ['id', 'name', 'type', 'createdAt', 'expiresAt'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed token information including permissions (default: false)',
        },
        fields: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Array of specific fields to include in the response. If provided, overrides detailed setting. Only works with top-level fields. Use detailed=true to get all fields including nested data.',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (
    params: {
      action?: string;
      tokenId?: string;
      name?: string;
      description?: string;
      type?: string;
      lifespan?: string;
      permissions?: string[];
      search?: string;
      idFilter?: string;
      nameFilter?: string;
      typeFilter?: string;
      expiredFilter?: boolean;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
      detailed?: boolean;
      fields?: string[];
    } = {}
  ): Promise<any> => {
    const {
      action,
      tokenId,
      name,
      description,
      type,
      lifespan,
      permissions,
      search,
      idFilter,
      nameFilter,
      typeFilter,
      expiredFilter,
      limit = 20,
      offset,
      sortBy,
      sortOrder,
      detailed = false,
      fields,
    } = params;

    if (!action) {
      return { error: 'Action parameter is required' };
    }

    // Helper function to apply pagination
    const applyPagination = <T>(items: T[], limit: number, offset?: number): T[] => {
      let paginated = [...items];
      if (offset) {
        paginated = paginated.slice(offset);
      }
      return paginated.slice(0, limit);
    };

    // Helper function to check if token is expired
    const isTokenExpired = (token: any): boolean => {
      if (!token.expiresAt) return false;
      return new Date(token.expiresAt) < new Date();
    };

    // TOKEN MANAGEMENT ACTIONS
    if (action === 'list_tokens') {
      try {
        let tokens: any[] = [];
        let totalCount = 0;

        // If ID filter is provided, query by specific ID
        if (idFilter) {
          // Try both string and number ID matching
          const idToFind = parseInt(idFilter, 10);
          if (!Number.isNaN(idToFind)) {
            let token = await strapi.admin.services['api-token'].getById(idToFind);
            if (!token) {
              // Try with string ID
              token = await strapi.admin.services['api-token'].getById(idFilter);
            }
            if (token) {
              tokens = [token];
              totalCount = 1;
            }
          }
        } else {
          // Query all tokens if no ID filter
          tokens = await strapi.admin.services['api-token'].list();
          totalCount = tokens.length;

          // Apply specific filters
          if (nameFilter) {
            tokens = tokens.filter((token: any) => token.name === nameFilter);
          }

          if (typeFilter) {
            tokens = tokens.filter((token: any) => token.type === typeFilter);
          }

          if (expiredFilter !== undefined) {
            tokens = tokens.filter((token: any) => isTokenExpired(token) === expiredFilter);
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            tokens = tokens.filter((token: any) => {
              const searchableFields = ['id', 'name', 'description'];
              return searchableFields.some((field) => {
                const value = (token as any)[field];
                return value && value.toString().toLowerCase().includes(searchLower);
              });
            });
          }

          // Apply sorting
          if (sortBy) {
            tokens.sort((a: any, b: any) => {
              let aVal = a[sortBy];
              let bVal = b[sortBy];

              // Handle special cases for sorting
              if (sortBy === 'expiresAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
              }

              if (aVal === null || aVal === undefined) aVal = '';
              if (bVal === null || bVal === undefined) bVal = '';

              const comparison = aVal.toString().localeCompare(bVal.toString());
              return sortOrder === 'desc' ? -comparison : comparison;
            });
          }
        }

        // Apply pagination
        tokens = applyPagination(tokens, limit, offset);

        // Apply progressive disclosure
        const responseTokens = tokens.map((token: any) => {
          if (fields && fields.length > 0) {
            const filtered: any = {};
            fields.forEach((field) => {
              if (Object.prototype.hasOwnProperty.call(token, field)) {
                filtered[field] = token[field];
              }
            });
            return filtered;
          }
          if (detailed) {
            return {
              id: token.id,
              name: token.name,
              description: token.description,
              type: token.type,
              lifespan: token.lifespan,
              expiresAt: token.expiresAt,
              permissions: token.permissions || {},
              isExpired: isTokenExpired(token),
            };
          }
          return {
            id: token.id,
            name: token.name,
            type: token.type,
            isExpired: isTokenExpired(token),
          };
        });

        return {
          action: 'list_tokens',
          tokens: responseTokens,
          count: tokens.length,
          totalCount,
          detailed,
          fields: fields || null,
          filters: {
            search,
            idFilter,
            nameFilter,
            typeFilter,
            expiredFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list tokens' };
      }
    }

    if (action === 'create_token') {
      if (!name) {
        return { error: 'Token name is required for create_token action' };
      }
      if (!type) {
        return { error: 'Token type is required for create_token action' };
      }

      // Validate permissions format for custom tokens
      if (type === 'custom' && permissions) {
        const invalidPermissions = permissions.filter(
          (perm) => !perm.startsWith('api::') && !perm.startsWith('plugin::')
        );
        if (invalidPermissions.length > 0) {
          return {
            error: 'Invalid permission format detected',
            details: `The following permissions don't follow the Content API format: ${invalidPermissions.join(', ')}.`,
            guidance: `API tokens use Content API permissions (e.g., "api::country.country.find"), NOT admin permissions (e.g., "plugin::content-manager.explorer.read").\n\nFormat: "api::<content-type>.<content-type>.<action>"\nExamples: api::country.country.find, api::article.article.create, api::category.category.update\nCommon actions: find, findOne, create, update, delete, publish`,
          };
        }
      }

      try {
        // Use Strapi's built-in API token service instead of direct DB queries
        const tokenData: any = {
          name,
          type,
        };
        if (description) tokenData.description = description;
        if (lifespan) {
          let lifespanMs: number | null = null;
          if (lifespan !== 'unlimited') {
            const days = parseInt(lifespan, 10);
            lifespanMs = days * 24 * 60 * 60 * 1000;
          }
          tokenData.lifespan = lifespanMs;
        }
        if (type === 'custom' && permissions) {
          tokenData.permissions = permissions;
        }

        // Use Strapi's API token service which handles permission creation properly
        const newToken = await strapi.admin.services['api-token'].create(tokenData);

        return {
          action: 'create_token',
          token: {
            id: newToken.id,
            name: newToken.name,
            description: newToken.description,
            type: newToken.type,
            lifespan: newToken.lifespan,
            expiresAt: newToken.expiresAt,
            permissions: newToken.permissions || {},
            accessKey: newToken.accessKey, // Include the access key for the user
          },
          message: 'Token created successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to create token' };
      }
    }

    if (action === 'update_token') {
      if (!tokenId) {
        return { error: 'Token ID is required for update_token action' };
      }

      // Validate permissions format for custom tokens
      if (type === 'custom' && permissions) {
        const invalidPermissions = permissions.filter(
          (perm) => !perm.startsWith('api::') && !perm.startsWith('plugin::')
        );
        if (invalidPermissions.length > 0) {
          return {
            error: 'Invalid permission format detected',
            details: `The following permissions don't follow the Content API format: ${invalidPermissions.join(', ')}.`,
            guidance: `API tokens use Content API permissions (e.g., "api::country.country.find"), NOT admin permissions (e.g., "plugin::content-manager.explorer.read").\n\nFormat: "api::<content-type>.<content-type>.<action>"\nExamples: api::country.country.find, api::article.article.create, api::category.category.update\nCommon actions: find, findOne, create, update, delete, publish`,
          };
        }
      }

      try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) {
          updateData.type = type;
          // Clear permissions for non-custom types
          if (type !== 'custom') {
            updateData.permissions = [];
          }
        }
        if (lifespan !== undefined) {
          let lifespanMs: number | null = null;
          if (lifespan !== 'unlimited') {
            const days = parseInt(lifespan, 10);
            lifespanMs = days * 24 * 60 * 60 * 1000;
          }
          updateData.lifespan = lifespanMs;
        }
        if (type === 'custom' && permissions !== undefined) {
          updateData.permissions = permissions;
        }

        // Use Strapi's API token service which handles permission updates properly
        const updatedToken = await strapi.admin.services['api-token'].update(tokenId, updateData);

        return {
          action: 'update_token',
          token: {
            id: updatedToken.id,
            name: updatedToken.name,
            description: updatedToken.description,
            type: updatedToken.type,
            lifespan: updatedToken.lifespan,
            expiresAt: updatedToken.expiresAt,
            permissions: updatedToken.permissions || {},
          },
          message: 'Token updated successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to update token' };
      }
    }

    if (action === 'delete_token') {
      if (!tokenId) {
        return { error: 'Token ID is required for delete_token action' };
      }
      try {
        await strapi.admin.services['api-token'].revoke(tokenId);
        return {
          action: 'delete_token',
          message: 'Token deleted successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete token' };
      }
    }

    if (action === 'list_available_permissions') {
      try {
        // Use the same method that Strapi's API token service uses for validation
        // This ensures we get the exact format that the service expects
        const validPermissions = strapi.contentAPI.permissions.providers.action.keys();

        return {
          action: 'list_available_permissions',
          permissions: validPermissions,
          count: validPermissions.length,
          message: `Found ${validPermissions.length} available Content API permissions`,
          note: 'These are the permissions that can be used for API tokens. Use these exact permission strings when creating custom tokens. Copy and paste these strings directly into the permissions array.',
          examples: validPermissions.slice(0, 4),
        };
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Failed to list available Content API permissions',
          details:
            'Could not retrieve Content API permissions. This might be due to the content API not being fully initialized.',
          fallback:
            'You can manually specify Content API permissions using the format: api::<content-type>.<content-type>.<action>',
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
