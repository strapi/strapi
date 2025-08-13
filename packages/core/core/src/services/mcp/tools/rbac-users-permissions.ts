import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACUsersPermissionsTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'users_permissions',
    description:
      '👥 U&P / UP / CONTENT REST API / Users and Permissions: Manage end users who authenticate and access your REST API and GraphQL API. These are your customers, members, or any end users who register/login to your site/app and make API calls. They get JWT tokens and can access content through the REST/GraphQL APIs based on their assigned roles. This is COMPLETELY SEPARATE from admin users who access the Strapi admin interface. This controls access to your content APIs, NOT the admin dashboard.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: [
            'list_users',
            'create_user',
            'update_user',
            'delete_user',
            'list_roles',
            'create_role',
            'update_role',
            'delete_role',
            'list_permissions',
          ],
          description: 'Action to perform',
        },
        // User parameters
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
        confirmed: {
          type: 'boolean',
          description: 'Whether user is confirmed (for create_user/update_user)',
        },
        blocked: {
          type: 'boolean',
          description: 'Whether user is blocked (for create_user/update_user)',
        },
        // Role parameters
        roleId: {
          type: 'string',
          description: 'Role ID (required for role-specific actions)',
        },
        roleName: {
          type: 'string',
          description: 'Role name (required for create_role)',
        },
        roleDescription: {
          type: 'string',
          description: 'Role description',
        },
        roleType: {
          type: 'string',
          description: 'Role type (for create_role/update_role)',
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
        // Permission operation types for update_role
        setPermissions: {
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
          description: 'Array of permissions to set (replaces existing permissions)',
        },
        addPermissions: {
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
          description: 'Array of permissions to add (merges with existing permissions)',
        },
        removePermissions: {
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
          description: 'Array of permissions to remove (subtracts from existing permissions)',
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
        roleNameFilter: {
          type: 'string',
          description: 'Filter roles by name (partial match)',
        },
        roleTypeFilter: {
          type: 'string',
          description: 'Filter roles by type',
        },
        permissionActionFilter: {
          type: 'string',
          description: 'Filter permissions by action (partial match)',
        },
        permissionSubjectFilter: {
          type: 'string',
          description: 'Filter permissions by subject (partial match)',
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
          enum: [
            'id',
            'email',
            'username',
            'name',
            'type',
            'action',
            'subject',
            'createdAt',
            'updatedAt',
          ],
          description: 'Field to sort by',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (asc or desc)',
        },
        detailed: {
          type: 'boolean',
          description: 'Return detailed information including populated relations (default: false)',
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
      // User parameters
      userId?: string;
      email?: string;
      username?: string;
      password?: string;
      confirmed?: boolean;
      blocked?: boolean;
      // Role parameters
      roleId?: string;
      roleName?: string;
      roleDescription?: string;
      roleType?: string;
      permissions?: Array<{
        action: string;
        subject?: string;
        properties?: Record<string, any>;
        conditions?: string[];
      }>;
      setPermissions?: Array<{
        action: string;
        subject?: string;
        properties?: Record<string, any>;
        conditions?: string[];
      }>;
      addPermissions?: Array<{
        action: string;
        subject?: string;
        properties?: Record<string, any>;
        conditions?: string[];
      }>;
      removePermissions?: Array<{
        action: string;
        subject?: string;
        properties?: Record<string, any>;
        conditions?: string[];
      }>;
      // Standard filter parameters
      search?: string;
      idFilter?: string;
      emailFilter?: string;
      usernameFilter?: string;
      confirmedFilter?: boolean;
      blockedFilter?: boolean;
      roleNameFilter?: string;
      roleTypeFilter?: string;
      permissionActionFilter?: string;
      permissionSubjectFilter?: string;
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
      // User parameters
      userId,
      email,
      username,
      password,
      confirmed,
      blocked,
      // Role parameters
      roleId,
      roleName,
      roleDescription,
      roleType,
      permissions,
      setPermissions,
      addPermissions,
      removePermissions,
      // Standard filter parameters
      search,
      idFilter,
      emailFilter,
      usernameFilter,
      confirmedFilter,
      blockedFilter,
      roleNameFilter,
      roleTypeFilter,
      permissionActionFilter,
      permissionSubjectFilter,
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

    // Helper function to process permissions with content type fields
    const processPermissions = async (permissions: any[]) => {
      return Promise.all(
        permissions.map(async (permission) => {
          let properties = permission.properties || {};
          if (permission.subject && permission.action.includes('api::')) {
            try {
              const contentType = (strapi.contentTypes as any)[permission.subject];
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
              console.log('[MCP] Could not get content type fields for', permission.subject);
            }
          }
          return { ...permission, properties };
        })
      );
    };

    // USER MANAGEMENT ACTIONS
    if (action === 'list_users') {
      try {
        let users: any[] = [];
        let totalCount = 0;

        // If ID filter is provided, query by specific ID
        if (idFilter) {
          // Try both string and number ID matching
          const idToFind = parseInt(idFilter, 10);
          if (!Number.isNaN(idToFind)) {
            let user = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { id: idToFind },
              populate: ['role'],
            });
            if (!user) {
              // Try with string ID
              user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: idFilter },
                populate: ['role'],
              });
            }
            if (user) {
              users = [user];
              totalCount = 1;
            }
          }
        } else {
          // Query all users if no ID filter
          users = await strapi.db.query('plugin::users-permissions.user').findMany({
            populate: ['role'],
          });
          totalCount = users.length;

          // Apply specific filters
          if (emailFilter) {
            const emailLower = emailFilter.toLowerCase();
            users = users.filter((user: any) => user.email?.toLowerCase().includes(emailLower));
          }

          if (usernameFilter) {
            const usernameLower = usernameFilter.toLowerCase();
            users = users.filter((user: any) =>
              user.username?.toLowerCase().includes(usernameLower)
            );
          }

          if (confirmedFilter !== undefined) {
            users = users.filter((user: any) => user.confirmed === confirmedFilter);
          }

          if (blockedFilter !== undefined) {
            users = users.filter((user: any) => user.blocked === blockedFilter);
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter((user: any) => {
              const searchableFields = ['id', 'email', 'username'];
              return searchableFields.some((field) => {
                const value = (user as any)[field];
                return value && value.toString().toLowerCase().includes(searchLower);
              });
            });
          }

          // Apply sorting
          if (sortBy) {
            users.sort((a: any, b: any) => {
              const aVal = a[sortBy] || '';
              const bVal = b[sortBy] || '';
              const comparison = aVal.toString().localeCompare(bVal.toString());
              return sortOrder === 'desc' ? -comparison : comparison;
            });
          }
        }

        // Apply pagination
        users = applyPagination(users, limit, offset);

        // Apply progressive disclosure
        const responseUsers = users.map((user: any) => {
          if (fields && fields.length > 0) {
            const filtered: any = {};
            fields.forEach((field) => {
              if (Object.prototype.hasOwnProperty.call(user, field)) {
                filtered[field] = user[field];
              }
            });
            return filtered;
          }
          if (detailed) {
            return {
              id: user.id,
              email: user.email,
              username: user.username,
              confirmed: user.confirmed,
              blocked: user.blocked,
              role: user.role
                ? {
                    id: user.role.id,
                    name: user.role.name,
                    type: user.role.type,
                  }
                : null,
            };
          }
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            confirmed: user.confirmed,
            blocked: user.blocked,
            roleName: user.role?.name || null,
          };
        });

        return {
          action: 'list_users',
          users: responseUsers,
          count: users.length,
          totalCount,
          detailed,
          fields: fields || null,
          filters: {
            search,
            idFilter,
            emailFilter,
            usernameFilter,
            confirmedFilter,
            blockedFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list users' };
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
          confirmed: confirmed !== undefined ? confirmed : true,
          blocked: blocked !== undefined ? blocked : false,
        };

        const newUser = await strapi.db.query('plugin::users-permissions.user').create({
          data: userData,
        });

        return {
          action: 'create_user',
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            confirmed: newUser.confirmed,
            blocked: newUser.blocked,
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
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (confirmed !== undefined) updateData.confirmed = confirmed;
        if (blocked !== undefined) updateData.blocked = blocked;

        const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userId },
          data: updateData,
        });

        return {
          action: 'update_user',
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            confirmed: updatedUser.confirmed,
            blocked: updatedUser.blocked,
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
        await strapi.db.query('plugin::users-permissions.user').delete({
          where: { id: userId },
        });
        return {
          action: 'delete_user',
          message: 'User deleted successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete user' };
      }
    }

    // ROLE MANAGEMENT ACTIONS
    if (action === 'list_roles') {
      try {
        let roles: any[] = [];
        let totalCount = 0;

        // If ID filter is provided, query by specific ID
        if (idFilter) {
          // Try both string and number ID matching
          const idToFind = parseInt(idFilter, 10);
          if (!Number.isNaN(idToFind)) {
            let role = await strapi.db.query('plugin::users-permissions.role').findOne({
              where: { id: idToFind },
              populate: ['users', 'permissions'],
            });
            if (!role) {
              // Try with string ID
              role = await strapi.db.query('plugin::users-permissions.role').findOne({
                where: { id: idFilter },
                populate: ['users', 'permissions'],
              });
            }
            if (role) {
              roles = [role];
              totalCount = 1;
            }
          }
        } else {
          // Query all roles if no ID filter
          roles = await strapi.db.query('plugin::users-permissions.role').findMany({
            populate: ['users', 'permissions'],
          });
          totalCount = roles.length;

          // Apply specific filters
          if (roleNameFilter) {
            const nameLower = roleNameFilter.toLowerCase();
            roles = roles.filter((role: any) => role.name?.toLowerCase().includes(nameLower));
          }

          if (roleTypeFilter) {
            roles = roles.filter((role: any) => role.type === roleTypeFilter);
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            roles = roles.filter((role: any) => {
              const searchableFields = ['id', 'name', 'type', 'description'];
              return searchableFields.some((field) => {
                const value = (role as any)[field];
                return value && value.toString().toLowerCase().includes(searchLower);
              });
            });
          }

          // Apply sorting
          if (sortBy) {
            roles.sort((a: any, b: any) => {
              const aVal = a[sortBy] || '';
              const bVal = b[sortBy] || '';
              const comparison = aVal.toString().localeCompare(bVal.toString());
              return sortOrder === 'desc' ? -comparison : comparison;
            });
          }
        }

        // Apply pagination
        roles = applyPagination(roles, limit, offset);

        // Apply progressive disclosure
        const responseRoles = roles.map((role: any) => {
          if (detailed) {
            return {
              id: role.id,
              name: role.name,
              description: role.description,
              type: role.type,
              usersCount: role.users?.length || 0,
              permissionsCount: role.permissions?.length || 0,
            };
          }
          return {
            id: role.id,
            name: role.name,
            type: role.type,
            usersCount: role.users?.length || 0,
            permissionsCount: role.permissions?.length || 0,
          };
        });

        return {
          action: 'list_roles',
          roles: responseRoles,
          count: roles.length,
          totalCount,
          detailed,
          filters: {
            search,
            idFilter,
            roleNameFilter,
            roleTypeFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list roles' };
      }
    }

    if (action === 'create_role') {
      if (!roleName) {
        return { error: 'Role name is required for create_role action' };
      }
      try {
        const roleData: any = {
          name: roleName,
        };
        if (roleDescription) roleData.description = roleDescription;
        if (roleType) roleData.type = roleType;

        const newRole = await strapi.db.query('plugin::users-permissions.role').create({
          data: roleData,
        });

        // If permissions are provided, set them immediately
        let permissionsSet: string[] = [];
        if (permissions && permissions.length > 0) {
          const processedPermissions = await processPermissions(permissions);
          await Promise.all(
            processedPermissions.map(async (permission) => {
              return strapi.db.query('plugin::users-permissions.permission').create({
                data: {
                  action: permission.action,
                  subject: permission.subject || null,
                  properties: permission.properties || {},
                  conditions: permission.conditions || [],
                  role: newRole.id,
                },
              });
            })
          );
          permissionsSet = permissions.map((p) => p.action);
        }

        return {
          action: 'create_role',
          role: {
            id: newRole.id,
            name: newRole.name,
            description: newRole.description,
            type: newRole.type,
          },
          permissionsSet: permissionsSet.length > 0 ? permissionsSet : undefined,
          message:
            permissionsSet.length > 0
              ? `Role created successfully with ${permissionsSet.length} permissions`
              : 'Role created successfully',
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
        if (roleDescription !== undefined) updateData.description = roleDescription;
        if (roleType !== undefined) updateData.type = roleType;

        const updatedRole = await strapi.db.query('plugin::users-permissions.role').update({
          where: { id: roleId },
          data: updateData,
        });

        // Handle permissions operations
        let permissionsMessage = '';
        if (setPermissions || addPermissions || removePermissions) {
          const currentRole = await strapi.db.query('plugin::users-permissions.role').findOne({
            where: { id: roleId },
            populate: ['permissions'],
          });

          if (setPermissions) {
            // Remove all existing permissions and set new ones
            if (currentRole.permissions && currentRole.permissions.length > 0) {
              await strapi.db.query('plugin::users-permissions.permission').deleteMany({
                where: { role: roleId },
              });
            }
            const processedPermissions = await processPermissions(setPermissions);
            await Promise.all(
              processedPermissions.map(async (permission) => {
                return strapi.db.query('plugin::users-permissions.permission').create({
                  data: {
                    action: permission.action,
                    subject: permission.subject || null,
                    properties: permission.properties || {},
                    conditions: permission.conditions || [],
                    role: roleId,
                  },
                });
              })
            );
            permissionsMessage = `Set ${setPermissions.length} permissions`;
          }

          if (addPermissions) {
            const processedPermissions = await processPermissions(addPermissions);
            await Promise.all(
              processedPermissions.map(async (permission) => {
                return strapi.db.query('plugin::users-permissions.permission').create({
                  data: {
                    action: permission.action,
                    subject: permission.subject || null,
                    properties: permission.properties || {},
                    conditions: permission.conditions || [],
                    role: roleId,
                  },
                });
              })
            );
            permissionsMessage += permissionsMessage
              ? `, added ${addPermissions.length} permissions`
              : `Added ${addPermissions.length} permissions`;
          }

          if (removePermissions) {
            const currentPermissions = currentRole.permissions || [];
            const permissionsToRemove = currentPermissions.filter((permission: any) =>
              removePermissions.some(
                (p: any) => p.action === permission.action && p.subject === permission.subject
              )
            );

            if (permissionsToRemove.length > 0) {
              await strapi.db.query('plugin::users-permissions.permission').deleteMany({
                where: { id: { $in: permissionsToRemove.map((p: any) => p.id) } },
              });
              permissionsMessage += permissionsMessage
                ? `, removed ${permissionsToRemove.length} permissions`
                : `Removed ${permissionsToRemove.length} permissions`;
            }
          }
        }

        return {
          action: 'update_role',
          role: {
            id: updatedRole.id,
            name: updatedRole.name,
            description: updatedRole.description,
            type: updatedRole.type,
          },
          permissionsMessage: permissionsMessage || undefined,
          message: permissionsMessage
            ? `Role updated successfully - ${permissionsMessage}`
            : 'Role updated successfully',
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
        await strapi.db.query('plugin::users-permissions.role').delete({
          where: { id: roleId },
        });
        return {
          action: 'delete_role',
          message: 'Role deleted successfully',
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to delete role' };
      }
    }

    // PERMISSIONS MANAGEMENT
    if (action === 'list_permissions') {
      try {
        let permissions: any[] = [];
        let totalCount = 0;

        // If ID filter is provided, query by specific ID
        if (idFilter) {
          // Try both string and number ID matching
          const idToFind = parseInt(idFilter, 10);
          if (!Number.isNaN(idToFind)) {
            let permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
              where: { id: idToFind },
              populate: ['role'],
            });
            if (!permission) {
              // Try with string ID
              permission = await strapi.db.query('plugin::users-permissions.permission').findOne({
                where: { id: idFilter },
                populate: ['role'],
              });
            }
            if (permission) {
              permissions = [permission];
              totalCount = 1;
            }
          }
        } else {
          // Query all permissions if no ID filter
          permissions = await strapi.db.query('plugin::users-permissions.permission').findMany({
            populate: ['role'],
          });
          totalCount = permissions.length;

          // Apply specific filters
          if (permissionActionFilter) {
            const actionLower = permissionActionFilter.toLowerCase();
            permissions = permissions.filter((permission: any) =>
              permission.action?.toLowerCase().includes(actionLower)
            );
          }

          if (permissionSubjectFilter) {
            const subjectLower = permissionSubjectFilter.toLowerCase();
            permissions = permissions.filter((permission: any) =>
              permission.subject?.toLowerCase().includes(subjectLower)
            );
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            permissions = permissions.filter((permission: any) => {
              const searchableFields = ['id', 'action', 'subject'];
              return searchableFields.some((field) => {
                const value = (permission as any)[field];
                return value && value.toString().toLowerCase().includes(searchLower);
              });
            });
          }

          // Apply sorting
          if (sortBy) {
            permissions.sort((a: any, b: any) => {
              const aVal = a[sortBy] || '';
              const bVal = b[sortBy] || '';
              const comparison = aVal.toString().localeCompare(bVal.toString());
              return sortOrder === 'desc' ? -comparison : comparison;
            });
          }
        }

        // Apply pagination
        permissions = applyPagination(permissions, limit, offset);

        // Apply progressive disclosure
        const responsePermissions = permissions.map((permission: any) => {
          if (detailed) {
            return {
              id: permission.id,
              action: permission.action,
              subject: permission.subject,
              properties: permission.properties,
              conditions: permission.conditions,
              role: permission.role
                ? {
                    id: permission.role.id,
                    name: permission.role.name,
                    type: permission.role.type,
                  }
                : null,
            };
          }
          return {
            id: permission.id,
            action: permission.action,
            subject: permission.subject,
            roleName: permission.role?.name || null,
          };
        });

        return {
          action: 'list_permissions',
          permissions: responsePermissions,
          count: permissions.length,
          totalCount,
          detailed,
          filters: {
            search,
            idFilter,
            permissionActionFilter,
            permissionSubjectFilter,
            limit,
            offset,
            sortBy,
            sortOrder,
          },
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Failed to list permissions' };
      }
    }

    return { error: `Unknown action: ${action}` };
  };

  return { tool, handler };
};
