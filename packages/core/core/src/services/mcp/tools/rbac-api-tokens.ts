import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACApiTokensTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'api_tokens',
    description:
      'Manage API TOKENS for external applications/services to access the Content API. This is separate from admin users and content API users. Use this for server-to-server communication or external apps. Permissions use Content API format like "api::country.country.find".',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'get',
            'update',
            'add_permissions',
            'remove_permissions',
            'list_all',
            'create',
            'list_available_permissions',
          ],
          description:
            'Action to perform. Use "list_available_permissions" to see what Content API permissions are available.',
        },
        tokenId: {
          type: 'string',
          description: 'Token ID (optional for bulk operations)',
        },
        name: {
          type: 'string',
          description: 'Token name (required for create action)',
        },
        description: {
          type: 'string',
          description: 'Token description',
        },
        type: {
          type: 'string',
          enum: ['read-only', 'full-access', 'custom'],
          description: 'Token type (read-only, full-access, custom)',
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
            'Array of Content API permission strings (required for custom type). Format: "api::<content-type>.<content-type>.<action>". Examples: ["api::country.country.find", "api::country.country.create"]. Do NOT use admin permissions like "plugin::content-manager.explorer.read".',
        },
        applyToAll: {
          type: 'boolean',
          description: 'Apply operation to all tokens (for bulk operations)',
        },
        // Search and filter parameters for list_all action
        search: {
          type: 'string',
          description: 'Search term to filter by name or description',
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
        expired: {
          type: 'boolean',
          description: 'Filter by expiration status (true for expired, false for active)',
        },
        createdAfter: {
          type: 'string',
          description: 'Filter tokens created after this date (ISO string)',
        },
        createdBefore: {
          type: 'string',
          description: 'Filter tokens created before this date (ISO string)',
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
          enum: ['name', 'type', 'createdAt', 'expiresAt'],
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
            'Array of specific fields to include in the response. If provided, overrides detailed setting.',
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
      applyToAll?: boolean;
      search?: string;
      nameFilter?: string;
      typeFilter?: string;
      expired?: boolean;
      createdAfter?: string;
      createdBefore?: string;
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
      applyToAll,
      search,
      nameFilter,
      typeFilter,
      expired,
      createdAfter,
      createdBefore,
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

    if (action === 'get') {
      if (!tokenId) {
        return { error: 'Token ID is required for get action' };
      }
      try {
        const token = await strapi.db.query('admin::api-token').findOne({
          where: { id: tokenId },
        });
        if (!token) {
          return { error: 'Token not found' };
        }
        return {
          action: 'get',
          token: {
            id: token.id,
            name: token.name,
            description: token.description,
            type: token.type,
            lifespan: token.lifespan,
            expiresAt: token.expiresAt,
            permissions: token.permissions || {},
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to get token' };
      }
    }

    if (action === 'update') {
      if (!tokenId && !applyToAll) {
        return { error: 'Token ID is required for update action, or set applyToAll to true' };
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
          // Pass permissions as array of strings (not object)
          updateData.permissions = permissions;
        }

        if (applyToAll) {
          const tokens = await strapi.db.query('admin::api-token').findMany();
          const results = [];
          for (const token of tokens) {
            const updatedToken = await strapi.db.query('admin::api-token').update({
              where: { id: token.id },
              data: updateData,
            });
            results.push({
              id: updatedToken.id,
              name: updatedToken.name,
              type: updatedToken.type,
              lifespan: updatedToken.lifespan,
            });
          }
          return {
            action: 'update',
            message: `Updated ${results.length} tokens`,
            tokens: results,
          };
        }
        const updatedToken = await strapi.db.query('admin::api-token').update({
          where: { id: tokenId },
          data: updateData,
        });
        return {
          action: 'update',
          token: {
            id: updatedToken.id,
            name: updatedToken.name,
            description: updatedToken.description,
            type: updatedToken.type,
            lifespan: updatedToken.lifespan,
            expiresAt: updatedToken.expiresAt,
            permissions: updatedToken.permissions || {},
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to update token(s)' };
      }
    }

    if (action === 'add_permissions') {
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return { error: 'Permissions array is required for add_permissions action' };
      }
      try {
        if (applyToAll) {
          const tokens = await strapi.db.query('admin::api-token').findMany();
          const results = [];
          for (const token of tokens) {
            const currentPermissions = token.permissions || {};
            const newPermissions = { ...currentPermissions };
            permissions.forEach((permission: string) => {
              newPermissions[permission] = true;
            });
            const updatedToken = await strapi.db.query('admin::api-token').update({
              where: { id: token.id },
              data: { permissions: newPermissions },
            });
            results.push({
              id: updatedToken.id,
              name: updatedToken.name,
              permissions: updatedToken.permissions,
            });
          }
          return {
            action: 'add_permissions',
            message: `Added permissions to ${results.length} tokens`,
            tokens: results,
          };
        }
        if (!tokenId) {
          return {
            error: 'Token ID is required for add_permissions action, or set applyToAll to true',
          };
        }
        const token = await strapi.db.query('admin::api-token').findOne({
          where: { id: tokenId },
        });
        if (!token) {
          return { error: 'Token not found' };
        }
        const currentPermissions = token.permissions || {};
        const newPermissions = { ...currentPermissions };
        permissions.forEach((permission: string) => {
          newPermissions[permission] = true;
        });
        const updatedToken = await strapi.db.query('admin::api-token').update({
          where: { id: tokenId },
          data: { permissions: newPermissions },
        });
        return {
          action: 'add_permissions',
          token: {
            id: updatedToken.id,
            name: updatedToken.name,
            permissions: updatedToken.permissions,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to add permissions' };
      }
    }

    if (action === 'remove_permissions') {
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return { error: 'Permissions array is required for remove_permissions action' };
      }
      try {
        if (applyToAll) {
          const tokens = await strapi.db.query('admin::api-token').findMany();
          const results = [];
          for (const token of tokens) {
            const currentPermissions = token.permissions || {};
            const newPermissions = { ...currentPermissions };
            permissions.forEach((permission: string) => {
              delete newPermissions[permission];
            });
            const updatedToken = await strapi.db.query('admin::api-token').update({
              where: { id: token.id },
              data: { permissions: newPermissions },
            });
            results.push({
              id: updatedToken.id,
              name: updatedToken.name,
              permissions: updatedToken.permissions,
            });
          }
          return {
            action: 'remove_permissions',
            message: `Removed permissions from ${results.length} tokens`,
            tokens: results,
          };
        }
        if (!tokenId) {
          return {
            error: 'Token ID is required for remove_permissions action, or set applyToAll to true',
          };
        }
        const token = await strapi.db.query('admin::api-token').findOne({
          where: { id: tokenId },
        });
        if (!token) {
          return { error: 'Token not found' };
        }
        const currentPermissions = token.permissions || {};
        const newPermissions = { ...currentPermissions };
        permissions.forEach((permission: string) => {
          delete newPermissions[permission];
        });
        const updatedToken = await strapi.db.query('admin::api-token').update({
          where: { id: tokenId },
          data: { permissions: newPermissions },
        });
        return {
          action: 'remove_permissions',
          token: {
            id: updatedToken.id,
            name: updatedToken.name,
            permissions: updatedToken.permissions,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to remove permissions' };
      }
    }

    if (action === 'list_all') {
      try {
        let tokens = await strapi.db.query('admin::api-token').findMany();

        // Apply filters
        if (search) {
          const searchLower = search.toLowerCase();
          tokens = tokens.filter(
            (token: any) =>
              token.name?.toLowerCase().includes(searchLower) ||
              token.description?.toLowerCase().includes(searchLower)
          );
        }

        if (nameFilter) {
          tokens = tokens.filter((token: any) => token.name === nameFilter);
        }

        if (typeFilter) {
          tokens = tokens.filter((token: any) => token.type === typeFilter);
        }

        if (expired !== undefined) {
          const now = new Date();
          tokens = tokens.filter((token: any) => {
            if (!token.expiresAt) return !expired; // No expiration = not expired
            return expired ? new Date(token.expiresAt) < now : new Date(token.expiresAt) >= now;
          });
        }

        if (createdAfter) {
          const afterDate = new Date(createdAfter);
          tokens = tokens.filter((token: any) => new Date(token.createdAt) >= afterDate);
        }

        if (createdBefore) {
          const beforeDate = new Date(createdBefore);
          tokens = tokens.filter((token: any) => new Date(token.createdAt) <= beforeDate);
        }

        // Apply sorting
        if (sortBy) {
          tokens.sort((a: any, b: any) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            let comparison = 0;

            if (typeof aVal === 'string' && typeof bVal === 'string') {
              comparison = aVal.localeCompare(bVal);
            } else if (aVal instanceof Date && bVal instanceof Date) {
              comparison = aVal.getTime() - bVal.getTime();
            } else if (aVal < bVal) comparison = -1;
            else if (aVal > bVal) comparison = 1;
            else comparison = 0;

            return sortOrder === 'desc' ? -comparison : comparison;
          });
        }

        const totalCount = tokens.length;

        // Apply pagination
        if (offset) {
          tokens = tokens.slice(offset);
        }
        if (limit) {
          tokens = tokens.slice(0, limit);
        }

        // Apply progressive disclosure based on detailed and fields flags
        const responseTokens = tokens.map((token: any) => {
          if (fields && fields.length > 0) {
            // Return only specified fields when fields parameter is provided
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
            };
          }
          return {
            id: token.id,
            name: token.name,
            type: token.type,
            permissionsCount: Object.keys(token.permissions || {}).length,
          };
        });

        return {
          action: 'list_all',
          tokens: responseTokens,
          count: tokens.length,
          totalCount,
          detailed,
          fields: fields || null,
          filters: {
            search,
            nameFilter,
            typeFilter,
            expired,
            createdAfter,
            createdBefore,
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

    if (action === 'list_available_permissions') {
      try {
        const actionsMap = await strapi.contentAPI.permissions.getActionsMap();
        const availablePermissions: string[] = [];

        // Convert the actions map to a flat list of permissions
        Object.entries(actionsMap).forEach(([api, value]: [string, any]) => {
          const { controllers } = value;
          Object.entries(controllers).forEach(([controller, actions]: [string, any]) => {
            actions.forEach((action: string) => {
              availablePermissions.push(`${api}.${controller}.${action}`);
            });
          });
        });

        return {
          action: 'list_available_permissions',
          permissions: availablePermissions,
          count: availablePermissions.length,
          message: `Found ${availablePermissions.length} available Content API permissions`,
          note: 'These are the permissions that can be used for API tokens. Format: api::<content-type>.<content-type>.<action>',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list available permissions',
          details:
            'Could not retrieve Content API permissions. This might be due to the content API not being fully initialized.',
        };
      }
    }

    if (action === 'create') {
      if (!name) {
        return { error: 'Name is required for create action' };
      }
      if (!type) {
        return { error: 'Type is required for create action' };
      }
      if (
        type === 'custom' &&
        (!permissions || !Array.isArray(permissions) || permissions.length === 0)
      ) {
        return {
          error: 'Permissions array is required for custom token type',
          details: `Custom API tokens require Content API permissions. Example:
{
  "permissions": ["api::country.country.find", "api::country.country.create"]
}

Format: "api::<content-type>.<content-type>.<action>"
Common actions: find, findOne, create, update, delete`,
        };
      }
      if (type !== 'custom' && permissions) {
        return { error: 'Permissions should not be provided for non-custom token types' };
      }

      // Validate permission format for custom tokens
      if (type === 'custom' && Array.isArray(permissions)) {
        const invalidPermissions = permissions.filter(
          (perm) => !perm.startsWith('api::') && !perm.startsWith('plugin::')
        );
        if (invalidPermissions.length > 0) {
          return {
            error: 'Invalid permission format detected',
            details: `The following permissions don't follow the Content API format: ${invalidPermissions.join(', ')}. 
            
Content API permissions should start with 'api::' or 'plugin::' and follow the format 'api::<content-type>.<content-type>.<action>'.
Examples: api::country.country.find, api::article.article.create, plugin::upload.upload.read`,
          };
        }
      }

      let lifespanMs: number | null = null;
      if (lifespan && lifespan !== 'unlimited') {
        const days = parseInt(lifespan, 10);
        lifespanMs = days * 24 * 60 * 60 * 1000;
      }

      const tokenAttributes: any = {
        name,
        description: description || '',
        type,
        lifespan: lifespanMs,
      };

      if (type === 'custom' && Array.isArray(permissions)) {
        // Pass permissions as array of strings (not object)
        tokenAttributes.permissions = permissions;
      }

      try {
        const apiTokenService = strapi.admin.services['api-token'];
        const newToken = await apiTokenService.create(tokenAttributes);
        return {
          action: 'create',
          token: {
            id: newToken.id,
            name: newToken.name,
            description: newToken.description,
            type: newToken.type,
            lifespan: newToken.lifespan,
            expiresAt: newToken.expiresAt,
            accessKey: newToken.accessKey,
            permissions: newToken.permissions || {},
          },
          message: 'Token created successfully',
        };
      } catch (error) {
        let errorMessage = error instanceof Error ? error.message : 'Failed to create token';
        let details = error instanceof Error ? error.stack : undefined;

        // Provide more helpful error messages for common permission issues
        if (errorMessage.includes('Unknown permissions provided:')) {
          const unknownPermissions = errorMessage.match(/Unknown permissions provided: (.+)/)?.[1];
          errorMessage = `Invalid permissions for API token. API tokens use Content API permissions (e.g., 'api::country.country.find'), not admin permissions (e.g., 'plugin::content-manager.explorer.read'). Unknown permissions: ${unknownPermissions}`;
          details = `API Token Permissions Guide:
          
1. API tokens use Content API permissions, not admin permissions
2. Format: 'api::<content-type>.<content-type>.<action>'
3. Common actions: find, findOne, create, update, delete
4. Example for countries: 'api::country.country.find'
5. Example for articles: 'api::article.article.create'

Admin permissions (for roles) vs Content API permissions (for tokens):
- Admin: 'plugin::content-manager.explorer.read'
- API Token: 'api::country.country.find'

To get available Content API permissions, check the API routes or use the content API permissions endpoint.`;
        } else if (errorMessage.includes('Missing permissions attribute for custom token')) {
          errorMessage =
            'Custom API tokens require permissions. Please provide a permissions array with Content API permissions.';
          details = `Example:
{
  "permissions": ["api::country.country.find", "api::country.country.create"]
}`;
        }

        return {
          error: errorMessage,
          details,
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
