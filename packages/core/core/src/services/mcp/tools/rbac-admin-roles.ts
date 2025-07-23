import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACAdminRolesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'rbac_admin_roles',
    description:
      'Manage admin roles RBAC settings including roles, permissions, and user assignments',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'get_user',
            'list_users',
            'create_user',
            'update_user',
            'delete_user',
            'get_role',
            'list_roles',
            'create_role',
            'update_role',
            'delete_role',
            'get_role_permissions',
            'update_role_permissions',
            'add_permissions_to_role',
            'remove_permissions_from_role',
            'assign_role_to_user',
            'remove_role_from_user',
            'list_available_actions',
          ],
          description: 'Action to perform',
        },
        userId: {
          type: 'string',
          description: 'User ID (required for user-specific actions)',
        },
        roleId: {
          type: 'string',
          description: 'Role ID (required for role-specific actions)',
        },
        email: {
          type: 'string',
          description: 'User email (required for create_user)',
        },
        firstname: {
          type: 'string',
          description: 'User first name',
        },
        lastname: {
          type: 'string',
          description: 'User last name',
        },
        username: {
          type: 'string',
          description: 'User username',
        },
        password: {
          type: 'string',
          description: 'User password (required for create_user)',
        },
        isActive: {
          type: 'boolean',
          description: 'Whether user is active',
        },
        roleName: {
          type: 'string',
          description: 'Role name (required for create_role)',
        },
        roleCode: {
          type: 'string',
          description: 'Role code (required for create_role)',
        },
        roleDescription: {
          type: 'string',
          description: 'Role description',
        },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              subject: { type: 'string' },
              properties: { type: 'object' },
              conditions: { type: 'array', items: { type: 'string' } },
            },
          },
          description: 'Array of permission objects',
        },
      },
      required: ['action'],
    },
  };

  const handler = async (params: {
    action: string;
    userId?: string;
    roleId?: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    username?: string;
    password?: string;
    isActive?: boolean;
    roleName?: string;
    roleCode?: string;
    roleDescription?: string;
    permissions?: Array<{
      action: string;
      subject?: string;
      properties?: Record<string, any>;
      conditions?: string[];
    }>;
  }): Promise<any> => {
    const {
      action,
      userId,
      roleId,
      email,
      firstname,
      lastname,
      username,
      password,
      isActive,
      roleName,
      roleCode,
      roleDescription,
      permissions,
    } = params;

    // User management actions
    if (action === 'get_user') {
      if (!userId) {
        return { error: 'User ID is required for get_user action' };
      }
      try {
        const user = await strapi.db.query('admin::user').findOne({
          where: { id: userId },
          populate: ['roles'],
        });
        if (!user) {
          return { error: 'User not found' };
        }
        return {
          action: 'get_user',
          user: {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            isActive: user.isActive,
            blocked: user.blocked,
            preferedLanguage: user.preferedLanguage,
            roles:
              user.roles?.map((role: any) => ({
                id: role.id,
                name: role.name,
                code: role.code,
                description: role.description,
              })) || [],
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to get user' };
      }
    }

    if (action === 'list_users') {
      try {
        const users = await strapi.db.query('admin::user').findMany({
          populate: ['roles'],
        });
        return {
          action: 'list_users',
          users: users.map((user: any) => ({
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            isActive: user.isActive,
            blocked: user.blocked,
            roles:
              user.roles?.map((role: any) => ({
                id: role.id,
                name: role.name,
                code: role.code,
              })) || [],
          })),
          count: users.length,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list users' };
      }
    }

    if (action === 'create_user') {
      if (!email) {
        return { error: 'Email is required for create_user action' };
      }
      if (!password) {
        return { error: 'Password is required for create_user action' };
      }
      try {
        const userData: any = {
          email,
          password,
          isActive: isActive !== undefined ? isActive : true,
        };
        if (firstname) userData.firstname = firstname;
        if (lastname) userData.lastname = lastname;
        if (username) userData.username = username;

        const userService = strapi.admin.services.user;
        const newUser = await userService.create(userData);
        return {
          action: 'create_user',
          user: {
            id: newUser.id,
            email: newUser.email,
            firstname: newUser.firstname,
            lastname: newUser.lastname,
            username: newUser.username,
            isActive: newUser.isActive,
          },
          message: 'User created successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to create user' };
      }
    }

    if (action === 'update_user') {
      if (!userId) {
        return { error: 'User ID is required for update_user action' };
      }
      try {
        const updateData: any = {};
        if (email !== undefined) updateData.email = email;
        if (firstname !== undefined) updateData.firstname = firstname;
        if (lastname !== undefined) updateData.lastname = lastname;
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (isActive !== undefined) updateData.isActive = isActive;

        const userService = strapi.admin.services.user;
        const updatedUser = await userService.update(userId, updateData);
        return {
          action: 'update_user',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstname: updatedUser.firstname,
            lastname: updatedUser.lastname,
            username: updatedUser.username,
            isActive: updatedUser.isActive,
          },
          message: 'User updated successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to update user' };
      }
    }

    if (action === 'delete_user') {
      if (!userId) {
        return { error: 'User ID is required for delete_user action' };
      }
      try {
        const userService = strapi.admin.services.user;
        await userService.deleteById(userId);
        return {
          action: 'delete_user',
          message: 'User deleted successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete user' };
      }
    }

    // Role management actions
    if (action === 'get_role') {
      if (!roleId) {
        return { error: 'Role ID is required for get_role action' };
      }
      try {
        const role = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
          populate: ['users', 'permissions'],
        });
        if (!role) {
          return { error: 'Role not found' };
        }
        return {
          action: 'get_role',
          role: {
            id: role.id,
            name: role.name,
            code: role.code,
            description: role.description,
            users:
              role.users?.map((user: any) => ({
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
              })) || [],
            permissions:
              role.permissions?.map((permission: any) => ({
                id: permission.id,
                action: permission.action,
                subject: permission.subject,
                properties: permission.properties,
                conditions: permission.conditions,
              })) || [],
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to get role' };
      }
    }

    if (action === 'list_roles') {
      try {
        const roles = await strapi.db.query('admin::role').findMany({
          populate: ['users', 'permissions'],
        });
        return {
          action: 'list_roles',
          roles: roles.map((role: any) => ({
            id: role.id,
            name: role.name,
            code: role.code,
            description: role.description,
            usersCount: role.users?.length || 0,
            permissionsCount: role.permissions?.length || 0,
          })),
          count: roles.length,
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list roles' };
      }
    }

    if (action === 'create_role') {
      if (!roleName) {
        return { error: 'Role name is required for create_role action' };
      }
      if (!roleCode) {
        return { error: 'Role code is required for create_role action' };
      }
      try {
        const roleData: any = {
          name: roleName,
          code: roleCode,
        };
        if (roleDescription) roleData.description = roleDescription;

        const roleService = strapi.admin.services.role;
        const newRole = await roleService.create(roleData);
        return {
          action: 'create_role',
          role: {
            id: newRole.id,
            name: newRole.name,
            code: newRole.code,
            description: newRole.description,
          },
          message: 'Role created successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to create role' };
      }
    }

    if (action === 'update_role') {
      if (!roleId) {
        return { error: 'Role ID is required for update_role action' };
      }
      try {
        const updateData: any = {};
        if (roleName !== undefined) updateData.name = roleName;
        if (roleCode !== undefined) updateData.code = roleCode;
        if (roleDescription !== undefined) updateData.description = roleDescription;

        const roleService = strapi.admin.services.role;
        const updatedRole = await roleService.update(roleId, updateData);
        return {
          action: 'update_role',
          role: {
            id: updatedRole.id,
            name: updatedRole.name,
            code: updatedRole.code,
            description: updatedRole.description,
          },
          message: 'Role updated successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to update role' };
      }
    }

    if (action === 'delete_role') {
      if (!roleId) {
        return { error: 'Role ID is required for delete_role action' };
      }
      try {
        const roleService = strapi.admin.services.role;
        await roleService.deleteByIds([roleId]);
        return {
          action: 'delete_role',
          message: 'Role deleted successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete role' };
      }
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
        return {
          action: 'get_role_permissions',
          roleId,
          permissions:
            role.permissions?.map((permission: any) => ({
              id: permission.id,
              action: permission.action,
              subject: permission.subject,
              properties: permission.properties,
              conditions: permission.conditions,
            })) || [],
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
        const roleService = strapi.admin.services.role;
        await roleService.assignPermissions(roleId, permissions);
        return {
          action: 'update_role_permissions',
          message: 'Role permissions updated successfully',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to update role permissions',
        };
      }
    }

    if (action === 'add_permissions_to_role') {
      if (!roleId) {
        return { error: 'Role ID is required for add_permissions_to_role action' };
      }
      if (!permissions || !Array.isArray(permissions)) {
        return { error: 'Permissions array is required for add_permissions_to_role action' };
      }
      try {
        const roleService = strapi.admin.services.role;
        await roleService.addPermissions(roleId, permissions);
        return {
          action: 'add_permissions_to_role',
          message: 'Permissions added to role successfully',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to add permissions to role',
        };
      }
    }

    if (action === 'remove_permissions_from_role') {
      if (!roleId) {
        return { error: 'Role ID is required for remove_permissions_from_role action' };
      }
      if (!permissions || !Array.isArray(permissions)) {
        return { error: 'Permissions array is required for remove_permissions_from_role action' };
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

        // Find permissions to remove
        const permissionsToRemove =
          role.permissions?.filter((permission: any) =>
            permissions.some(
              (p: any) => p.action === permission.action && p.subject === permission.subject
            )
          ) || [];

        if (permissionsToRemove.length > 0) {
          const permissionService = strapi.admin.services.permission;
          await permissionService.deleteByIds(permissionsToRemove.map((p: any) => p.id));
        }

        return {
          action: 'remove_permissions_from_role',
          message: `Removed ${permissionsToRemove.length} permissions from role`,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to remove permissions from role',
        };
      }
    }

    if (action === 'assign_role_to_user') {
      if (!userId) {
        return { error: 'User ID is required for assign_role_to_user action' };
      }
      if (!roleId) {
        return { error: 'Role ID is required for assign_role_to_user action' };
      }
      try {
        const user = await strapi.db.query('admin::user').findOne({
          where: { id: userId },
          populate: ['roles'],
        });
        if (!user) {
          return { error: 'User not found' };
        }

        const role = await strapi.db.query('admin::role').findOne({
          where: { id: roleId },
        });
        if (!role) {
          return { error: 'Role not found' };
        }

        const currentRoles = user.roles || [];
        const roleExists = currentRoles.some((r: any) => r.id === roleId);
        if (roleExists) {
          return { error: 'User already has this role' };
        }

        const userService = strapi.admin.services.user;
        await userService.update(userId, {
          roles: [...currentRoles.map((r: any) => r.id), roleId],
        });

        return {
          action: 'assign_role_to_user',
          message: 'Role assigned to user successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to assign role to user' };
      }
    }

    if (action === 'remove_role_from_user') {
      if (!userId) {
        return { error: 'User ID is required for remove_role_from_user action' };
      }
      if (!roleId) {
        return { error: 'Role ID is required for remove_role_from_user action' };
      }
      try {
        const user = await strapi.db.query('admin::user').findOne({
          where: { id: userId },
          populate: ['roles'],
        });
        if (!user) {
          return { error: 'User not found' };
        }

        const currentRoles = user.roles || [];
        const roleExists = currentRoles.some((r: any) => r.id === roleId);
        if (!roleExists) {
          return { error: 'User does not have this role' };
        }

        const userService = strapi.admin.services.user;
        await userService.update(userId, {
          roles: currentRoles.filter((r: any) => r.id !== roleId).map((r: any) => r.id),
        });

        return {
          action: 'remove_role_from_user',
          message: 'Role removed from user successfully',
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to remove role from user',
        };
      }
    }

    if (action === 'list_available_actions') {
      try {
        const permissionService = strapi.admin.services.permission;
        const actions = permissionService.actionProvider.values();
        return {
          action: 'list_available_actions',
          actions: actions.map((action: any) => ({
            actionId: action.actionId,
            displayName: action.displayName,
            plugin: action.plugin,
            section: action.section,
            subCategory: action.subCategory,
          })),
          count: actions.length,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list available actions',
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
