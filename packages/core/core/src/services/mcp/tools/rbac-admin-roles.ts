import type { Core } from '@strapi/types';
import type { MCPToolHandler } from '../types';

export const createRBACAdminRolesTool = (strapi: Core.Strapi): MCPToolHandler => {
  const tool = {
    name: 'admin_roles',
    description:
      '🔐 ADMIN PANEL USERS & ROLES: Manage users and roles who access the Strapi admin interface (http://localhost:1337/admin). These are content editors, administrators, and developers who log into the admin panel to create/edit content, manage users, configure plugins, etc. This is COMPLETELY SEPARATE from U&P (Users & Permissions), UP users, content API users, and API tokens. Permissions use admin format like "plugin::content-manager.explorer.read". This controls access to the Strapi admin dashboard, NOT the REST/GraphQL APIs.\n\n💡 CRITICAL: To create a functional role, ALWAYS use the "permissions" parameter during create_role. Example: create_role with roleName="My Role", roleCode="my-role", permissions=[{"action": "plugin::content-manager.explorer.read", "subject": "api::country.country"}]. The permissions parameter is the way to set permissions during role creation.',
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
        // Role parameters
        roleId: {
          type: 'string',
          description:
            'Role ID (required for role-specific actions). For update_user, this assigns the role to the user.',
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
              action: {
                type: 'string',
                description: 'Permission action (e.g., "plugin::content-manager.explorer.read")',
              },
              subject: {
                type: 'string',
                description: 'Content type or plugin (e.g., "api::country.country")',
              },
              properties: {
                type: 'object',
                description: 'Permission properties (usually auto-populated)',
              },
              conditions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Permission conditions',
              },
            },
          },
          description:
            '⚠️ CRITICAL: Array of permission objects. Use this parameter during create_role to set permissions. This is the ONLY way to create a functional role with permissions. Example: [{"action": "plugin::content-manager.explorer.read", "subject": "api::country.country"}]',
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
          description:
            '⚠️ Array of permissions to set (replaces existing permissions). Only use this for update_role, NOT create_role.',
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
          description:
            '⚠️ Array of permissions to add (merges with existing permissions). Only use this for update_role, NOT create_role.',
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
          description:
            '⚠️ Array of permissions to remove (subtracts from existing permissions). Only use this for update_role, NOT create_role.',
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
        firstnameFilter: {
          type: 'string',
          description: 'Filter users by first name (partial match)',
        },
        lastnameFilter: {
          type: 'string',
          description: 'Filter users by last name (partial match)',
        },
        isActiveFilter: {
          type: 'boolean',
          description: 'Filter users by active status',
        },
        roleNameFilter: {
          type: 'string',
          description: 'Filter roles by name (partial match)',
        },
        roleCodeFilter: {
          type: 'string',
          description: 'Filter roles by code (partial match)',
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
            'firstname',
            'lastname',
            'name',
            'code',
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
      firstname?: string;
      lastname?: string;
      username?: string;
      password?: string;
      isActive?: boolean;
      // Role parameters
      roleId?: string;
      roleName?: string;
      roleCode?: string;
      roleDescription?: string;
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
      firstnameFilter?: string;
      lastnameFilter?: string;
      isActiveFilter?: boolean;
      roleNameFilter?: string;
      roleCodeFilter?: string;
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
      firstname,
      lastname,
      username,
      password,
      isActive,
      // Role parameters
      roleId,
      roleName,
      roleCode,
      roleDescription,
      permissions,
      setPermissions,
      addPermissions,
      removePermissions,
      // Standard filter parameters
      search,
      idFilter,
      emailFilter,
      usernameFilter,
      firstnameFilter,
      lastnameFilter,
      isActiveFilter,
      roleNameFilter,
      roleCodeFilter,
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
          if (
            permission.subject &&
            permission.action.includes('plugin::content-manager.explorer')
          ) {
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
            let user = await strapi.db.query('admin::user').findOne({
              where: { id: idToFind },
              populate: ['roles'],
            });
            if (!user) {
              // Try with string ID
              user = await strapi.db.query('admin::user').findOne({
                where: { id: idFilter },
                populate: ['roles'],
              });
            }
            if (user) {
              users = [user];
              totalCount = 1;
            }
          }
        } else {
          // Query all users if no ID filter
          users = await strapi.db.query('admin::user').findMany({
            populate: ['roles'],
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

          if (firstnameFilter) {
            const firstnameLower = firstnameFilter.toLowerCase();
            users = users.filter((user: any) =>
              user.firstname?.toLowerCase().includes(firstnameLower)
            );
          }

          if (lastnameFilter) {
            const lastnameLower = lastnameFilter.toLowerCase();
            users = users.filter((user: any) =>
              user.lastname?.toLowerCase().includes(lastnameLower)
            );
          }

          if (isActiveFilter !== undefined) {
            users = users.filter((user: any) => user.isActive === isActiveFilter);
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter((user: any) => {
              const searchableFields = ['id', 'email', 'username', 'firstname', 'lastname'];
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
              firstname: user.firstname,
              lastname: user.lastname,
              username: user.username,
              isActive: user.isActive,
              blocked: user.blocked,
              roles: (Array.isArray(user.roles) ? user.roles : []).map((role: any) => ({
                id: role.id,
                name: role.name,
                code: role.code,
              })),
            };
          }
          return {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
            rolesCount: (Array.isArray(user.roles) ? user.roles : []).length,
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
            firstnameFilter,
            lastnameFilter,
            isActiveFilter,
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

        // Create user using database query instead of broken userService
        const newUser = await strapi.db.query('admin::user').create({
          data: userData,
        });

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

        // Handle role assignment
        if (roleId !== undefined) {
          // First get the current user to check existing roles
          const currentUser = await strapi.db.query('admin::user').findOne({
            where: { id: userId },
            populate: ['roles'],
          });

          if (currentUser) {
            // Remove existing roles and assign new role
            if (currentUser.roles && currentUser.roles.length > 0) {
              await strapi.db.query('admin::user').update({
                where: { id: userId },
                data: { roles: [] },
              });
            }

            // Assign the new role
            await strapi.db.query('admin::user').update({
              where: { id: userId },
              data: { roles: [roleId] },
            });
          }
        }

        // Update other user fields using database query
        if (Object.keys(updateData).length > 0) {
          await strapi.db.query('admin::user').update({
            where: { id: userId },
            data: updateData,
          });
        }

        // Get updated user with roles
        const userWithRoles = await strapi.db.query('admin::user').findOne({
          where: { id: userId },
          populate: ['roles'],
        });

        return {
          action: 'update_user',
          user: {
            id: userWithRoles.id,
            email: userWithRoles.email,
            firstname: userWithRoles.firstname,
            lastname: userWithRoles.lastname,
            username: userWithRoles.username,
            isActive: userWithRoles.isActive,
            roles:
              userWithRoles?.roles?.map((role: any) => ({
                id: role.id,
                name: role.name,
                code: role.code,
              })) || [],
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
        // Delete user using database query instead of broken userService
        await strapi.db.query('admin::user').delete({
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
            let role = await strapi.db.query('admin::role').findOne({
              where: { id: idToFind },
              populate: ['users', 'permissions'],
            });
            if (!role) {
              // Try with string ID
              role = await strapi.db.query('admin::role').findOne({
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
          roles = await strapi.db.query('admin::role').findMany({
            populate: ['users', 'permissions'],
          });
          totalCount = roles.length;

          // Apply specific filters
          if (roleNameFilter) {
            const nameLower = roleNameFilter.toLowerCase();
            roles = roles.filter((role: any) => role.name?.toLowerCase().includes(nameLower));
          }

          if (roleCodeFilter) {
            const codeLower = roleCodeFilter.toLowerCase();
            roles = roles.filter((role: any) => role.code?.toLowerCase().includes(codeLower));
          }

          // Apply search filter
          if (search) {
            const searchLower = search.toLowerCase();
            roles = roles.filter((role: any) => {
              const searchableFields = ['id', 'name', 'code', 'description'];
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
              code: role.code,
              description: role.description,
              usersCount: role.users?.length || 0,
              permissionsCount: role.permissions?.length || 0,
            };
          }
          return {
            id: role.id,
            name: role.name,
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
            roleCodeFilter,
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
      if (!roleCode) {
        return { error: 'Role code is required for create_role action' };
      }

      // Warn if no permissions are provided
      if (!permissions || permissions.length === 0) {
        return {
          error:
            '⚠️ WARNING: No permissions provided! Roles without permissions cannot access any features. Use the "permissions" parameter to set permissions during role creation. Example: permissions=[{"action": "plugin::content-manager.explorer.read", "subject": "api::country.country"}]',
        };
      }

      try {
        const roleData: any = {
          name: roleName,
          code: roleCode,
        };
        if (roleDescription) roleData.description = roleDescription;

        const roleService = strapi.admin.services.role;
        const newRole = await roleService.create(roleData);

        // If permissions are provided, set them immediately
        let permissionsSet: string[] = [];
        if (permissions && permissions.length > 0) {
          const processedPermissions = await processPermissions(permissions);
          await Promise.all(
            processedPermissions.map(async (permission) => {
              return strapi.db.query('admin::permission').create({
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
            code: newRole.code,
            description: newRole.description,
          },
          permissionsSet: permissionsSet.length > 0 ? permissionsSet : undefined,
          message:
            permissionsSet.length > 0
              ? `✅ Role created successfully with ${permissionsSet.length} permissions! Users with this role can now access the specified features.`
              : 'Role created successfully',
          tip: '💡 To assign this role to a user, use update_user with roleId parameter.',
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

        // Handle permissions operations
        let permissionsMessage = '';
        if (setPermissions || addPermissions || removePermissions) {
          const currentRole = await strapi.db.query('admin::role').findOne({
            where: { id: roleId },
            populate: ['permissions'],
          });

          if (setPermissions) {
            // Remove all existing permissions and set new ones
            if (currentRole.permissions && currentRole.permissions.length > 0) {
              const permissionService = strapi.admin.services.permission;
              await permissionService.deleteByIds(currentRole.permissions.map((p: any) => p.id));
            }
            const processedPermissions = await processPermissions(setPermissions);
            await Promise.all(
              processedPermissions.map(async (permission) => {
                return strapi.db.query('admin::permission').create({
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
            // Create new permissions directly in the database
            await Promise.all(
              processedPermissions.map(async (permission) => {
                return strapi.db.query('admin::permission').create({
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
              const permissionService = strapi.admin.services.permission;
              await permissionService.deleteByIds(permissionsToRemove.map((p: any) => p.id));
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
            code: updatedRole.code,
            description: updatedRole.description,
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
            let permission = await strapi.db.query('admin::permission').findOne({
              where: { id: idToFind },
              populate: ['role'],
            });
            if (!permission) {
              // Try with string ID
              permission = await strapi.db.query('admin::permission').findOne({
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
          permissions = await strapi.db.query('admin::permission').findMany({
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
                    code: permission.role.code,
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
