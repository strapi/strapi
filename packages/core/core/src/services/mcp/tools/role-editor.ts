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

  const handler = async (params: {
    action: string;
    roleId?: string;
    sourceRoleId?: string;
    permissionAction?: string;
    permissionSubject?: string;
    category?: string;
    permissions?: Array<{
      action: string;
      subject?: string;
      enabled: boolean;
    }>;
  }): Promise<any> => {
    const {
      action,
      roleId,
      sourceRoleId,
      permissionAction,
      permissionSubject,
      category,
      permissions,
    } = params;

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
        const allPermissions = role.permissions || [];

        allPermissions.forEach((permission: any) => {
          const actionParts = permission.action.split('::');
          const category = actionParts[0] || 'other';
          if (!groupedPermissions[category]) {
            groupedPermissions[category] = [];
          }
          groupedPermissions[category].push({
            id: permission.id,
            action: permission.action,
            subject: permission.subject,
            properties: permission.properties,
            conditions: permission.conditions,
          });
        });

        return {
          action: 'get_role_permissions',
          roleId,
          roleName: role.name,
          roleCode: role.code,
          permissions: groupedPermissions,
          totalPermissions: allPermissions.length,
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
        const strapiPermissions = permissions
          .filter((p) => p.enabled)
          .map((p) => ({
            action: p.action,
            subject: p.subject || null,
            properties: {},
            conditions: [],
          }));

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
        const permission = {
          action: permissionAction,
          subject: permissionSubject || null,
          properties: {},
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
        const permissionToRemove = role.permissions?.find(
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

        // Group actions by category
        const categories: Record<string, any> = {};
        actions.forEach((action: any) => {
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

        let filteredActions = actions;
        if (category && category !== 'all') {
          filteredActions = actions.filter((action: any) => action.section === category);
        }

        return {
          action: 'list_available_permissions',
          category: category || 'all',
          permissions: filteredActions.map((action: any) => ({
            actionId: action.actionId,
            displayName: action.displayName,
            plugin: action.plugin,
            section: action.section,
            subCategory: action.subCategory,
          })),
          count: filteredActions.length,
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
        const currentPermissions = role.permissions || [];
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
