import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACApiTokensTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'rbac_api_tokens',
    description: 'Manage API token RBAC settings including permissions, type, and expiration',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'update', 'add_permissions', 'remove_permissions', 'list_all', 'create'],
          description: 'Action to perform',
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
          description: 'Array of permission strings (required for custom type)',
        },
        applyToAll: {
          type: 'boolean',
          description: 'Apply operation to all tokens (for bulk operations)',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (params: {
    action: string;
    tokenId?: string;
    name?: string;
    description?: string;
    type?: string;
    lifespan?: string;
    permissions?: string[];
    applyToAll?: boolean;
  }): Promise<any> => {
    const { action, tokenId, name, description, type, lifespan, permissions, applyToAll } = params;

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
          // Convert array of permission strings to object format
          const permissionsObj: Record<string, boolean> = {};
          permissions.forEach((permission: string) => {
            permissionsObj[permission] = true;
          });
          updateData.permissions = permissionsObj;
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
        const tokens = await strapi.db.query('admin::api-token').findMany();
        return {
          action: 'list_all',
          tokens: tokens.map((token: any) => ({
            id: token.id,
            name: token.name,
            description: token.description,
            type: token.type,
            lifespan: token.lifespan,
            expiresAt: token.expiresAt,
            permissions: token.permissions || {},
          })),
          count: tokens.length,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list tokens' };
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
        return { error: 'Permissions array is required for custom token type' };
      }
      if (type !== 'custom' && permissions) {
        return { error: 'Permissions should not be provided for non-custom token types' };
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
        // Convert array of permission strings to object format
        const permissionsObj: Record<string, boolean> = {};
        permissions.forEach((permission: string) => {
          permissionsObj[permission] = true;
        });
        tokenAttributes.permissions = permissionsObj;
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
        return {
          error: error instanceof Error ? error.message : 'Failed to create token',
          details: error instanceof Error ? error.stack : undefined,
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
