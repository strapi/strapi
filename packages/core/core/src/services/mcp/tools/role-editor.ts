import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRoleEditorTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'role_editor',
    description:
      'Easy-to-use role editor for managing role permissions with predefined categories and actions',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'get_role_permissions',
            'update_role_permissions',
            'add_permission_to_role',
            'remove_permission_from_role',
            'list_permission_categories',
            'list_available_permissions',
            'copy_permissions_from_role',
            'reset_role_permissions',
          ],
          description: 'Action to perform',
        },
        roleId: {
          type: 'string',
          description: 'Role ID (required for most actions)',
        },
        sourceRoleId: {
          type: 'string',
          description: 'Source role ID (for copy_permissions_from_role action)',
        },
        permissionAction: {
          type: 'string',
          description:
            'Permission action (e.g., "admin::users.read", "plugin::content-manager.explorer.create")',
        },
        permissionSubject: {
          type: 'string',
          description: 'Permission subject (e.g., "api::article.article", "admin::user")',
        },
        category: {
          type: 'string',
          enum: ['content-types', 'plugins', 'settings', 'admin', 'api', 'all'],
          description: 'Permission category to filter by',
        },
        search: {
          type: 'string',
          description: 'Search term to filter permissions by display name or action',
        },
        plugin: {
          type: 'string',
          description: 'Filter by specific plugin',
        },
        subCategory: {
          type: 'string',
          description: 'Filter by subcategory',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed permission information (default: false)',
        },
        grouped: {
          type: 'boolean',
          description: 'Group permissions by category for better overview (default: true)',
        },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              subject: { type: 'string' },
              enabled: { type: 'boolean' },
            },
          },
          description: 'Array of permission objects for bulk updates',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (
    params: {
      action?: string;
      roleId?: string;
      sourceRoleId?: string;
      permissionAction?: string;
      permissionSubject?: string;
      category?: string;
      search?: string;
      plugin?: string;
      subCategory?: string;
      limit?: number;
      offset?: number;
      detailed?: boolean;
      grouped?: boolean;
      permissions?: Array<{
        action: string;
        subject?: string;
        enabled: boolean;
      }>;
    } = {}
  ): Promise<any> => {
    const {
      action,
      roleId,
      sourceRoleId,
      permissionAction,
      permissionSubject,
      category,
      search,
      plugin,
      subCategory,
      limit = 20,
      offset,
      detailed = false,
      grouped = true,
      permissions,
    } = params;

    if (!action) {
      return { error: 'Action parameter is required' };
    }

    if (action === 'get_role_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for get_role_permissions action' };
      }
      try {
        const role = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
          populate: ['permissions'],
        });
        if (!role) {
          return { error: 'Role not found' };
        }

        // Group permissions by category for easier reading
        const groupedPermissions: Record<string, any[]> = {};
        const allPermissions = Array.isArray(role.permissions) ? role.permissions : [];

        allPermissions.forEach((permission: any) => {
          if (permission && permission.action) {
            const actionParts = permission.action.split('::');
            const category = actionParts[0] || 'other';
            if (!groupedPermissions[category]) {
              groupedPermissions[category] = [];
            }
            groupedPermissions[category].push({
              id: permission.id,
              action: permission.action,
              subject: permission.subject || null,
              properties: permission.properties || {},
              conditions: permission.conditions || [],
            });
          }
        });

        // Apply smart grouping and progressive disclosure
        let responsePermissions;
        if (grouped) {
          if (detailed) {
            responsePermissions = groupedPermissions;
          } else {
            // Return category summaries with minimal data
            responsePermissions = Object.entries(groupedPermissions).map(([category, perms]) => ({
              category,
              count: perms.length,
              // Only include a few example permissions per category
              examples: perms.slice(0, 3).map((p) => p.action),
            }));
          }
        } else {
          // Flatten permissions
          const flatPermissions = Object.values(groupedPermissions).flat();
          if (detailed) {
            responsePermissions = flatPermissions;
          } else {
            responsePermissions = flatPermissions.map((p) => ({
              action: p.action,
            }));
          }
        }

        return {
          action: 'get_role_permissions',
          roleId,
          roleName: role.name,
          roleCode: role.code,
          permissions: responsePermissions,
          totalPermissions: allPermissions.length,
          detailed,
          grouped,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to get role permissions' };
      }
    }

    if (action === 'update_role_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for update_role_permissions action' };
      }
      if (!permissions || !Array.isArray(permissions)) {
        return { error: 'Permissions array is required for update_role_permissions action' };
      }

      try {
        // Convert the simplified permissions format to Strapi's format
        const strapiPermissions = await Promise.all(
          permissions
            .filter((p) => p.enabled)
            .map(async (p) => {
              // Get fields for content type permissions
              let properties = {};
              if (p.subject && p.action.includes('plugin::content-manager.explorer')) {
                try {
                  // Get the content type definition from the content type builder
                  const contentType = (strapi.contentTypes as any)[p.subject];
                  if (contentType && contentType.attributes) {
                    const fields = Object.keys(contentType.attributes).filter(
                      (key) =>
                        key !== 'id' &&
                        key !== 'createdAt' &&
                        key !== 'updatedAt' &&
                        key !== 'publishedAt'
                    );
                    properties = { fields };
                  }
                } catch (error) {
                  // If we can't get the content type, use empty properties
                  console.log('[MCP] Could not get content type fields for', p.subject);
                }
              }

              return {
                action: p.action,
                subject: p.subject || null,
                properties,
                conditions: [],
              };
            })
        );

        const roleService = strapi.admin.services.role;
        await roleService.assignPermissions(roleId, strapiPermissions);

        return {
          action: 'update_role_permissions',
          roleId,
          message: `Updated ${strapiPermissions.length} permissions for role`,
          updatedPermissions: strapiPermissions.length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to update role permissions',
        };
      }
    }

    if (action === 'add_permission_to_role') {
      if (!roleId) {
        return { error: 'Role ID is required for add_permission_to_role action' };
      }
      if (!permissionAction) {
        return { error: 'Permission action is required for add_permission_to_role action' };
      }

      try {
        // Get fields for content type permissions
        let properties = {};
        if (permissionSubject && permissionAction.includes('plugin::content-manager.explorer')) {
          try {
            // Get the content type definition from the content type builder
            const contentType = (strapi.contentTypes as any)[permissionSubject];
            if (contentType && contentType.attributes) {
              const fields = Object.keys(contentType.attributes).filter(
                (key) =>
                  key !== 'id' &&
                  key !== 'createdAt' &&
                  key !== 'updatedAt' &&
                  key !== 'publishedAt'
              );
              properties = { fields };
            }
          } catch (error) {
            // If we can't get the content type, use empty properties
            console.log('[MCP] Could not get content type fields for', permissionSubject);
          }
        }

        const permission = {
          action: permissionAction,
          subject: permissionSubject || null,
          properties,
          conditions: [],
        };

        const roleService = strapi.admin.services.role;
        await roleService.addPermissions(roleId, [permission]);

        return {
          action: 'add_permission_to_role',
          roleId,
          permission,
          message: 'Permission added to role successfully',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to add permission to role',
        };
      }
    }

    if (action === 'remove_permission_from_role') {
      if (!roleId) {
        return { error: 'Role ID is required for remove_permission_from_role action' };
      }
      if (!permissionAction) {
        return { error: 'Permission action is required for remove_permission_from_role action' };
      }

      try {
        // Get current permissions
        const role = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
          populate: ['permissions'],
        });
        if (!role) {
          return { error: 'Role not found' };
        }

        // Find permission to remove
        const permissionToRemove = (Array.isArray(role.permissions) ? role.permissions : []).find(
          (permission: any) =>
            permission.action === permissionAction &&
            permission.subject === (permissionSubject || null)
        );

        if (!permissionToRemove) {
          return { error: 'Permission not found on role' };
        }

        const permissionService = strapi.admin.services.permission;
        await permissionService.deleteByIds([permissionToRemove.id]);

        return {
          action: 'remove_permission_from_role',
          roleId,
          removedPermission: {
            action: permissionToRemove.action,
            subject: permissionToRemove.subject,
          },
          message: 'Permission removed from role successfully',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to remove permission from role',
        };
      }
    }

    if (action === 'list_permission_categories') {
      try {
        const permissionService = strapi.admin.services.permission;
        const actions = permissionService.actionProvider.values();

        // Ensure actions is an array
        const actionsArray = Array.isArray(actions) ? actions : [];

        // Group actions by category
        const categories: Record<string, any> = {};
        actionsArray.forEach((action: any) => {
          if (action && action.section) {
            const category = action.section || 'other';
            if (!categories[category]) {
              categories[category] = {
                name: category,
                actions: [],
              };
            }
            categories[category].actions.push({
              actionId: action.actionId,
              displayName: action.displayName,
              plugin: action.plugin,
              subCategory: action.subCategory,
            });
          }
        });

        return {
          action: 'list_permission_categories',
          categories: Object.values(categories),
          count: Object.keys(categories).length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list permission categories',
        };
      }
    }

    if (action === 'list_available_permissions') {
      try {
        const permissionService = strapi.admin.services.permission;
        const actions = permissionService.actionProvider.values();

        // Ensure actions is an array
        let filteredActions = Array.isArray(actions) ? actions : [];

        // Apply category filter
        if (category && category !== 'all') {
          filteredActions = filteredActions.filter(
            (action: any) => action && action.section === category
          );
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          filteredActions = filteredActions.filter(
            (action: any) =>
              action &&
              (action.displayName?.toLowerCase().includes(searchLower) ||
                action.actionId?.toLowerCase().includes(searchLower))
          );
        }

        // Apply plugin filter
        if (plugin) {
          const pluginLower = plugin.toLowerCase();
          filteredActions = filteredActions.filter(
            (action: any) => action && action.plugin?.toLowerCase().includes(pluginLower)
          );
        }

        // Apply subcategory filter
        if (subCategory) {
          const subCategoryLower = subCategory.toLowerCase();
          filteredActions = filteredActions.filter(
            (action: any) => action && action.subCategory?.toLowerCase().includes(subCategoryLower)
          );
        }

        const totalCount = filteredActions.length;

        // Apply pagination
        if (offset) {
          filteredActions = filteredActions.slice(offset);
        }
        if (limit) {
          filteredActions = filteredActions.slice(0, limit);
        }

        // Apply progressive disclosure based on detailed flag
        const responsePermissions = filteredActions.map((action: any) => {
          if (detailed) {
            return {
              actionId: action.actionId,
              displayName: action.displayName,
              plugin: action.plugin,
              section: action.section,
              subCategory: action.subCategory,
            };
          }
          return {
            actionId: action.actionId,
            displayName: action.displayName,
          };
        });

        return {
          action: 'list_available_permissions',
          category: category || 'all',
          permissions: responsePermissions,
          count: filteredActions.length,
          totalCount,
          detailed,
          filters: { category, search, plugin, subCategory, limit, offset },
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list available permissions',
        };
      }
    }

    if (action === 'copy_permissions_from_role') {
      if (!roleId) {
        return { error: 'Target role ID is required for copy_permissions_from_role action' };
      }
      if (!sourceRoleId) {
        return { error: 'Source role ID is required for copy_permissions_from_role action' };
      }

      try {
        // Get source role permissions
        const sourceRole = await strapi.db.query('admin::role').findOne({
          where: { id: sourceRoleId },
          populate: ['permissions'],
        });
        if (!sourceRole) {
          return { error: 'Source role not found' };
        }

        // Get target role
        const targetRole = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
        });
        if (!targetRole) {
          return { error: 'Target role not found' };
        }

        // Convert permissions to Strapi format
        const permissions =
          sourceRole.permissions?.map((permission: any) => ({
            action: permission.action,
            subject: permission.subject,
            properties: permission.properties,
            conditions: permission.conditions,
          })) || [];

        const roleService = strapi.admin.services.role;
        await roleService.assignPermissions(roleId, permissions);

        return {
          action: 'copy_permissions_from_role',
          sourceRoleId,
          targetRoleId: roleId,
          copiedPermissions: permissions.length,
          message: `Copied ${permissions.length} permissions from source role`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to copy permissions from role',
        };
      }
    }

    if (action === 'reset_role_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for reset_role_permissions action' };
      }

      try {
        // Get current permissions
        const role = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
          populate: ['permissions'],
        });
        if (!role) {
          return { error: 'Role not found' };
        }

        // Remove all permissions
        const currentPermissions = Array.isArray(role.permissions) ? role.permissions : [];
        if (currentPermissions.length > 0) {
          const permissionService = strapi.admin.services.permission;
          await permissionService.deleteByIds(currentPermissions.map((p: any) => p.id));
        }

        return {
          action: 'reset_role_permissions',
          roleId,
          removedPermissions: currentPermissions.length,
          message: `Reset role permissions - removed ${currentPermissions.length} permissions`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to reset role permissions',
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
