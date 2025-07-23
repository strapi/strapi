import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createUPRolesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'up_roles',
    description:
      'Manage CONTENT API ROLES and permissions for content API users. This is separate from admin roles and API tokens. Use this to define what content API users can access. Permissions use Content API format like "api::article.article.find".',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_roles',
            'get_role',
            'create_role',
            'update_role',
            'delete_role',
            'get_role_permissions',
            'update_role_permissions',
            'add_permission_to_role',
            'remove_permission_from_role',
            'set_content_type_permissions',
            'list_available_permissions',
          ],
          description: 'Action to perform',
        },
        roleId: {
          type: 'string',
          description: 'Role ID (required for role-specific actions)',
        },
        name: {
          type: 'string',
          description: 'Role name (required for create_role)',
        },
        description: {
          type: 'string',
          description: 'Role description (for create_role/update_role)',
        },
        type: {
          type: 'string',
          description: 'Role type (for create_role/update_role)',
        },
        permissionAction: {
          type: 'string',
          description: 'Permission action (e.g., "api::article.article.find")',
        },
        contentTypeUid: {
          type: 'string',
          description: 'Content type UID for set_content_type_permissions action',
        },
        permissionsToSet: {
          type: 'string',
          description:
            'Comma-separated list of permissions to set (find,findOne,create,update,delete)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter roles by name or description',
        },
        nameFilter: {
          type: 'string',
          description: 'Filter roles by name (partial match)',
        },
        typeFilter: {
          type: 'string',
          description: 'Filter roles by type',
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
          enum: ['name', 'type', 'createdAt', 'updatedAt'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed role information (default: false)',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (
    params: {
      action?: string;
      roleId?: string;
      name?: string;
      description?: string;
      type?: string;
      permissionAction?: string;
      contentTypeUid?: string;
      permissionsToSet?: string;
      search?: string;
      nameFilter?: string;
      typeFilter?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: string;
      detailed?: boolean;
    } = {}
  ): Promise<any> => {
    const {
      action,
      roleId,
      name,
      description,
      type,
      permissionAction,
      contentTypeUid,
      permissionsToSet,
      search,
      nameFilter,
      typeFilter,
      limit = 20,
      offset,
      sortBy,
      sortOrder,
      detailed = false,
    } = params;

    if (!action) {
      return { error: 'Action parameter is required' };
    }

    if (action === 'list_roles') {
      try {
        const query: any = {
          populate: ['permissions', 'users'],
        };

        // Apply filters
        if (search) {
          query.where = {
            $or: [{ name: { $containsi: search } }, { description: { $containsi: search } }],
          };
        } else {
          query.where = {};
        }

        if (nameFilter) {
          query.where.name = { $containsi: nameFilter };
        }

        if (typeFilter) {
          query.where.type = typeFilter;
        }

        // Apply sorting
        if (sortBy) {
          query.orderBy = { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };
        }

        // Apply pagination
        if (offset) {
          query.offset = offset;
        }
        if (limit) {
          query.limit = limit;
        }

        const roles = await strapi.db.query('plugin::users-permissions.role').findMany(query);
        const totalCount = await strapi.db
          .query('plugin::users-permissions.role')
          .count(query.where);

        // Apply progressive disclosure
        const responseRoles = detailed
          ? roles
          : roles.map((role: any) => ({
              id: role.id,
              name: role.name,
              description: role.description,
              type: role.type,
              permissionsCount: role.permissions?.length || 0,
              usersCount: role.users?.length || 0,
              createdAt: role.createdAt,
            }));

        return {
          action: 'list_roles',
          roles: responseRoles,
          count: roles.length,
          totalCount,
          detailed,
          filters: {
            search,
            nameFilter,
            typeFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list roles',
          success: false,
        };
      }
    }

    if (action === 'get_role') {
      if (!roleId) {
        return { error: 'Role ID is required for get_role action' };
      }

      try {
        const role = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { id: roleId },
          populate: ['permissions', 'users'],
        });

        if (!role) {
          return { error: 'Role not found' };
        }

        const responseRole = detailed
          ? role
          : {
              id: role.id,
              name: role.name,
              description: role.description,
              type: role.type,
              permissionsCount: role.permissions?.length || 0,
              usersCount: role.users?.length || 0,
              createdAt: role.createdAt,
            };

        return {
          action: 'get_role',
          role: responseRole,
          detailed,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to get role',
          success: false,
        };
      }
    }

    if (action === 'create_role') {
      if (!name) {
        return { error: 'Name is required for create_role action' };
      }

      try {
        const roleData: any = {
          name,
          description: description || '',
          type: type || 'custom',
        };

        const role = await strapi.db.query('plugin::users-permissions.role').create({
          data: roleData,
          populate: ['permissions', 'users'],
        });

        // If content type permissions are provided, set them immediately
        let permissionsSet: string[] = [];
        if (contentTypeUid && permissionsToSet) {
          // Parse comma-separated permissions string
          const permissionsArray = permissionsToSet
            .split(',')
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

          if (permissionsArray.length > 0) {
            // Map permission names to U&P action IDs
            const actionMap: Record<string, string> = {
              find: `${contentTypeUid}.find`,
              findOne: `${contentTypeUid}.findOne`,
              create: `${contentTypeUid}.create`,
              update: `${contentTypeUid}.update`,
              delete: `${contentTypeUid}.delete`,
            };

            // Create new permissions
            const newPermissions = await Promise.all(
              permissionsArray.map(async (permName) => {
                const actionId = actionMap[permName];
                if (!actionId) {
                  throw new Error(`Unknown permission: ${permName}`);
                }
                return strapi.db.query('plugin::users-permissions.permission').create({
                  data: {
                    action: actionId,
                    role: role.id,
                  },
                });
              })
            );

            permissionsSet = permissionsArray;
          }
        }

        const responseRole = detailed
          ? role
          : {
              id: role.id,
              name: role.name,
              description: role.description,
              type: role.type,
              permissionsCount: role.permissions?.length || 0,
              usersCount: role.users?.length || 0,
              createdAt: role.createdAt,
            };

        return {
          action: 'create_role',
          role: responseRole,
          permissionsSet: permissionsSet.length > 0 ? permissionsSet : undefined,
          contentTypeUid: permissionsSet.length > 0 ? contentTypeUid : undefined,
          message:
            permissionsSet.length > 0
              ? `Role created successfully with ${permissionsSet.length} permissions`
              : 'Role created successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to create role',
          success: false,
        };
      }
    }

    if (action === 'update_role') {
      if (!roleId) {
        return { error: 'Role ID is required for update_role action' };
      }

      try {
        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;

        const role = await strapi.db.query('plugin::users-permissions.role').update({
          where: { id: roleId },
          data: updateData,
          populate: ['permissions', 'users'],
        });

        if (!role) {
          return { error: 'Role not found' };
        }

        const responseRole = detailed
          ? role
          : {
              id: role.id,
              name: role.name,
              description: role.description,
              type: role.type,
              permissionsCount: role.permissions?.length || 0,
              usersCount: role.users?.length || 0,
              createdAt: role.createdAt,
            };

        return {
          action: 'update_role',
          role: responseRole,
          message: 'Role updated successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to update role',
          success: false,
        };
      }
    }

    if (action === 'delete_role') {
      if (!roleId) {
        return { error: 'Role ID is required for delete_role action' };
      }

      try {
        const role = await strapi.db.query('plugin::users-permissions.role').delete({
          where: { id: roleId },
        });

        if (!role) {
          return { error: 'Role not found' };
        }

        return {
          action: 'delete_role',
          roleId,
          message: 'Role deleted successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to delete role',
          success: false,
        };
      }
    }

    if (action === 'get_role_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for get_role_permissions action' };
      }

      try {
        const role = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { id: roleId },
          populate: ['permissions'],
        });

        if (!role) {
          return { error: 'Role not found' };
        }

        const permissions = Array.isArray(role.permissions) ? role.permissions : [];

        const responsePermissions = detailed
          ? permissions
          : permissions.map((permission: any) => ({
              id: permission.id,
              action: permission.action,
            }));

        return {
          action: 'get_role_permissions',
          roleId,
          roleName: role.name,
          permissions: responsePermissions,
          totalPermissions: permissions.length,
          detailed,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to get role permissions',
          success: false,
        };
      }
    }

    if (action === 'update_role_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for update_role_permissions action' };
      }

      try {
        // Get current permissions
        const role = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { id: roleId },
          populate: ['permissions'],
        });

        if (!role) {
          return { error: 'Role not found' };
        }

        // Remove all existing permissions
        const currentPermissions = Array.isArray(role.permissions) ? role.permissions : [];
        if (currentPermissions.length > 0) {
          await strapi.db.query('plugin::users-permissions.permission').deleteMany({
            where: { id: { $in: currentPermissions.map((p: any) => p.id) } },
          });
        }

        return {
          action: 'update_role_permissions',
          roleId,
          removedPermissions: currentPermissions.length,
          message: `Updated role permissions - removed ${currentPermissions.length} permissions`,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to update role permissions',
          success: false,
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
        const permission = await strapi.db.query('plugin::users-permissions.permission').create({
          data: {
            action: permissionAction,
            role: roleId,
          },
        });

        return {
          action: 'add_permission_to_role',
          roleId,
          permission,
          message: 'Permission added to role successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to add permission to role',
          success: false,
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
        // Find permission to remove
        const permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: {
            action: permissionAction,
            role: roleId,
          },
        });

        if (!permission) {
          return { error: 'Permission not found on role' };
        }

        await strapi.db.query('plugin::users-permissions.permission').delete({
          where: { id: permission.id },
        });

        return {
          action: 'remove_permission_from_role',
          roleId,
          removedPermission: {
            action: permission.action,
          },
          message: 'Permission removed from role successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to remove permission from role',
          success: false,
        };
      }
    }

    if (action === 'set_content_type_permissions') {
      if (!roleId) {
        return { error: 'Role ID is required for set_content_type_permissions action' };
      }
      if (!contentTypeUid) {
        return { error: 'Content type UID is required for set_content_type_permissions action' };
      }
      if (!permissionsToSet) {
        return { error: 'Permissions string is required for set_content_type_permissions action' };
      }

      try {
        // Parse comma-separated permissions string
        const permissionsArray = permissionsToSet
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        if (permissionsArray.length === 0) {
          return { error: 'No valid permissions found in permissions string' };
        }

        // Map permission names to U&P action IDs
        const actionMap: Record<string, string> = {
          find: `${contentTypeUid}.find`,
          findOne: `${contentTypeUid}.findOne`,
          create: `${contentTypeUid}.create`,
          update: `${contentTypeUid}.update`,
          delete: `${contentTypeUid}.delete`,
        };

        // Remove existing permissions for this content type
        const existingPermissions = await strapi.db
          .query('plugin::users-permissions.permission')
          .findMany({
            where: {
              role: roleId,
              action: { $containsi: contentTypeUid },
            },
          });

        if (existingPermissions.length > 0) {
          await strapi.db.query('plugin::users-permissions.permission').deleteMany({
            where: { id: { $in: existingPermissions.map((p: any) => p.id) } },
          });
        }

        // Create new permissions
        const newPermissions = await Promise.all(
          permissionsArray.map(async (permName) => {
            const actionId = actionMap[permName];
            if (!actionId) {
              throw new Error(`Unknown permission: ${permName}`);
            }
            return strapi.db.query('plugin::users-permissions.permission').create({
              data: {
                action: actionId,
                role: roleId,
              },
            });
          })
        );

        return {
          action: 'set_content_type_permissions',
          roleId,
          contentTypeUid,
          permissionsSet: permissionsArray,
          message: `Set ${newPermissions.length} permissions for content type ${contentTypeUid}`,
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to set content type permissions',
          success: false,
        };
      }
    }

    if (action === 'list_available_permissions') {
      try {
        // Get all available content types for permissions
        const contentTypes = Object.values(strapi.contentTypes).filter(
          (ct: any) => ct.kind === 'collectionType' && ct.uid.startsWith('api::')
        );

        const availablePermissions = contentTypes.map((ct: any) => ({
          contentTypeUid: ct.uid,
          contentTypeName: ct.info?.displayName || ct.uid,
          permissions: [
            { name: 'find', action: `${ct.uid}.find`, description: 'List items' },
            { name: 'findOne', action: `${ct.uid}.findOne`, description: 'Get single item' },
            { name: 'create', action: `${ct.uid}.create`, description: 'Create new item' },
            { name: 'update', action: `${ct.uid}.update`, description: 'Update item' },
            { name: 'delete', action: `${ct.uid}.delete`, description: 'Delete item' },
          ],
        }));

        return {
          action: 'list_available_permissions',
          permissions: availablePermissions,
          count: availablePermissions.length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list available permissions',
          success: false,
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
