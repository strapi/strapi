import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createUPUsersTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'up_users',
    description:
      'Manage CONTENT API USERS (end users who authenticate and access your content API). This is separate from admin users and API tokens. Use this for user registration, authentication, and user-specific content access. These users get JWT tokens and can access content based on their assigned roles.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_users',
            'get_user',
            'create_user',
            'update_user',
            'delete_user',
            'assign_role_to_user',
            'remove_role_from_user',
            'block_user',
            'unblock_user',
            'confirm_user',
          ],
          description: 'Action to perform',
        },
        userId: {
          type: 'string',
          description: 'User ID (required for user-specific actions)',
        },
        email: {
          type: 'string',
          description: 'User email (required for create_user)',
        },
        username: {
          type: 'string',
          description: 'User username (required for create_user)',
        },
        password: {
          type: 'string',
          description: 'User password (required for create_user)',
        },
        roleId: {
          type: 'string',
          description: 'Role ID for role assignment actions',
        },
        confirmed: {
          type: 'boolean',
          description: 'Whether user is confirmed (for create_user/update_user)',
        },
        blocked: {
          type: 'boolean',
          description: 'Whether user is blocked (for create_user/update_user)',
        },
        search: {
          type: 'string',
          description: 'Search term to filter users by email or username',
        },
        emailFilter: {
          type: 'string',
          description: 'Filter users by email (partial match)',
        },
        usernameFilter: {
          type: 'string',
          description: 'Filter users by username (partial match)',
        },
        confirmedFilter: {
          type: 'boolean',
          description: 'Filter users by confirmation status',
        },
        blockedFilter: {
          type: 'boolean',
          description: 'Filter users by blocked status',
        },
        roleFilter: {
          type: 'string',
          description: 'Filter users by role ID',
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
          enum: ['email', 'username', 'createdAt', 'updatedAt'],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed user information (default: false)',
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
      userId?: string;
      email?: string;
      username?: string;
      password?: string;
      roleId?: string;
      confirmed?: boolean;
      blocked?: boolean;
      search?: string;
      emailFilter?: string;
      usernameFilter?: string;
      confirmedFilter?: boolean;
      blockedFilter?: boolean;
      roleFilter?: string;
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
      userId,
      email,
      username,
      password,
      roleId,
      confirmed,
      blocked,
      search,
      emailFilter,
      usernameFilter,
      confirmedFilter,
      blockedFilter,
      roleFilter,
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

    if (action === 'list_users') {
      try {
        const query: any = {
          populate: ['role'],
        };

        // Apply filters
        if (search) {
          query.where = {
            $or: [{ email: { $containsi: search } }, { username: { $containsi: search } }],
          };
        } else {
          query.where = {};
        }

        if (emailFilter) {
          query.where.email = { $containsi: emailFilter };
        }

        if (usernameFilter) {
          query.where.username = { $containsi: usernameFilter };
        }

        if (confirmedFilter !== undefined) {
          query.where.confirmed = confirmedFilter;
        }

        if (blockedFilter !== undefined) {
          query.where.blocked = blockedFilter;
        }

        if (roleFilter) {
          query.where.role = roleFilter;
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

        const users = await strapi.db.query('plugin::users-permissions.user').findMany(query);
        const totalCount = await strapi.db
          .query('plugin::users-permissions.user')
          .count(query.where);

        // Apply progressive disclosure based on detailed and fields flags
        let responseUsers;
        if (fields && fields.length > 0) {
          // Return only specified fields when fields parameter is provided
          responseUsers = users.map((user: any) => {
            const filtered: any = {};
            fields.forEach((field) => {
              if (Object.prototype.hasOwnProperty.call(user, field)) {
                filtered[field] = user[field];
              }
            });
            return filtered;
          });
        } else if (detailed) {
          responseUsers = users;
        } else {
          responseUsers = users.map((user: any) => ({
            id: user.id,
            email: user.email,
            username: user.username,
            confirmed: user.confirmed,
            blocked: user.blocked,
            role: user.role ? { id: user.role.id, name: user.role.name } : null,
            createdAt: user.createdAt,
          }));
        }

        return {
          action: 'list_users',
          users: responseUsers,
          count: users.length,
          totalCount,
          detailed,
          fields: fields || null,
          filters: {
            search,
            emailFilter,
            usernameFilter,
            confirmedFilter,
            blockedFilter,
            roleFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to list users',
          success: false,
        };
      }
    }

    if (action === 'get_user') {
      if (!userId) {
        return { error: 'User ID is required for get_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: userId },
          populate: ['role'],
        });

        if (!user) {
          return { error: 'User not found' };
        }

        const responseUser = detailed
          ? user
          : {
              id: user.id,
              email: user.email,
              username: user.username,
              confirmed: user.confirmed,
              blocked: user.blocked,
              role: user.role ? { id: user.role.id, name: user.role.name } : null,
              createdAt: user.createdAt,
            };

        return {
          action: 'get_user',
          user: responseUser,
          detailed,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to get user',
          success: false,
        };
      }
    }

    if (action === 'create_user') {
      if (!email) {
        return { error: 'Email is required for create_user action' };
      }
      if (!username) {
        return { error: 'Username is required for create_user action' };
      }
      if (!password) {
        return { error: 'Password is required for create_user action' };
      }

      try {
        const userData: any = {
          email,
          username,
          password,
          confirmed: confirmed !== undefined ? confirmed : false,
          blocked: blocked !== undefined ? blocked : false,
        };

        if (roleId) {
          userData.role = roleId;
        }

        const user = await strapi.db.query('plugin::users-permissions.user').create({
          data: userData,
          populate: ['role'],
        });

        const responseUser = detailed
          ? user
          : {
              id: user.id,
              email: user.email,
              username: user.username,
              confirmed: user.confirmed,
              blocked: user.blocked,
              role: user.role ? { id: user.role.id, name: user.role.name } : null,
              createdAt: user.createdAt,
            };

        return {
          action: 'create_user',
          user: responseUser,
          message: 'User created successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to create user',
          success: false,
        };
      }
    }

    if (action === 'update_user') {
      if (!userId) {
        return { error: 'User ID is required for update_user action' };
      }

      try {
        const updateData: any = {};

        if (email !== undefined) updateData.email = email;
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (confirmed !== undefined) updateData.confirmed = confirmed;
        if (blocked !== undefined) updateData.blocked = blocked;
        if (roleId !== undefined) updateData.role = roleId;

        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: updateData,
          populate: ['role'],
        });

        if (!user) {
          return { error: 'User not found' };
        }

        const responseUser = detailed
          ? user
          : {
              id: user.id,
              email: user.email,
              username: user.username,
              confirmed: user.confirmed,
              blocked: user.blocked,
              role: user.role ? { id: user.role.id, name: user.role.name } : null,
              createdAt: user.createdAt,
            };

        return {
          action: 'update_user',
          user: responseUser,
          message: 'User updated successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to update user',
          success: false,
        };
      }
    }

    if (action === 'delete_user') {
      if (!userId) {
        return { error: 'User ID is required for delete_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').delete({
          where: { id: userId },
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'delete_user',
          userId,
          message: 'User deleted successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to delete user',
          success: false,
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
        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { role: roleId },
          populate: ['role'],
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'assign_role_to_user',
          userId,
          roleId,
          message: 'Role assigned to user successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to assign role to user',
          success: false,
        };
      }
    }

    if (action === 'remove_role_from_user') {
      if (!userId) {
        return { error: 'User ID is required for remove_role_from_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { role: null },
          populate: ['role'],
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'remove_role_from_user',
          userId,
          message: 'Role removed from user successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to remove role from user',
          success: false,
        };
      }
    }

    if (action === 'block_user') {
      if (!userId) {
        return { error: 'User ID is required for block_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { blocked: true },
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'block_user',
          userId,
          message: 'User blocked successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to block user',
          success: false,
        };
      }
    }

    if (action === 'unblock_user') {
      if (!userId) {
        return { error: 'User ID is required for unblock_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { blocked: false },
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'unblock_user',
          userId,
          message: 'User unblocked successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to unblock user',
          success: false,
        };
      }
    }

    if (action === 'confirm_user') {
      if (!userId) {
        return { error: 'User ID is required for confirm_user action' };
      }

      try {
        const user = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: { confirmed: true },
        });

        if (!user) {
          return { error: 'User not found' };
        }

        return {
          action: 'confirm_user',
          userId,
          message: 'User confirmed successfully',
          success: true,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Failed to confirm user',
          success: false,
        };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
