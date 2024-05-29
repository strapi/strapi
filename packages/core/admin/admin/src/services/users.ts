import * as Permissions from '../../../shared/contracts/permissions';
import * as Roles from '../../../shared/contracts/roles';
import * as Users from '../../../shared/contracts/user';

import { adminApi } from './api';

import type { Data } from '@strapi/types';

const usersService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['LicenseLimits', 'User', 'Role', 'RolePermissions'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      /**
       * users
       */
      createUser: builder.mutation<Users.Create.Response['data'], Users.Create.Request['body']>({
        query: (body) => ({
          url: '/admin/users',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: Users.Create.Response) => response.data,
        invalidatesTags: ['LicenseLimits', { type: 'User', id: 'LIST' }],
      }),
      updateUser: builder.mutation<
        Users.Update.Response['data'],
        Omit<Users.Update.Request['body'] & Users.Update.Params, 'blocked'>
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/users/${id}`,
          method: 'PUT',
          data: body,
        }),
        invalidatesTags: (_res, _err, { id }) => [
          { type: 'User', id },
          { type: 'User', id: 'LIST' },
        ],
      }),
      getUsers: builder.query<
        {
          users: Users.FindAll.Response['data']['results'];
          pagination: Users.FindAll.Response['data']['pagination'] | null;
        },
        GetUsersParams
      >({
        query: ({ id, ...params } = {}) => ({
          url: `/admin/users/${id ?? ''}`,
          method: 'GET',
          config: {
            params,
          },
        }),
        transformResponse: (res: Users.FindAll.Response | Users.FindOne.Response) => {
          let users: Users.FindAll.Response['data']['results'] = [];

          if (res.data) {
            if ('results' in res.data) {
              if (Array.isArray(res.data.results)) {
                users = res.data.results;
              }
            } else {
              users = [res.data];
            }
          }

          return {
            users,
            pagination: 'pagination' in res.data ? res.data.pagination : null,
          };
        },
        providesTags: (res, _err, arg) => {
          if (typeof arg === 'object' && 'id' in arg) {
            return [{ type: 'User' as const, id: arg.id }];
          } else {
            return [
              ...(res?.users.map(({ id }) => ({ type: 'User' as const, id })) ?? []),
              { type: 'User' as const, id: 'LIST' },
            ];
          }
        },
      }),
      deleteManyUsers: builder.mutation<
        Users.DeleteMany.Response['data'],
        Users.DeleteMany.Request['body']
      >({
        query: (body) => ({
          url: '/admin/users/batch-delete',
          method: 'POST',
          data: body,
        }),
        transformResponse: (res: Users.DeleteMany.Response) => res.data,
        invalidatesTags: ['LicenseLimits', { type: 'User', id: 'LIST' }],
      }),
      /**
       * roles
       */
      createRole: builder.mutation<Roles.Create.Response['data'], Roles.Create.Request['body']>({
        query: (body) => ({
          url: '/admin/roles',
          method: 'POST',
          data: body,
        }),
        transformResponse: (res: Roles.Create.Response) => res.data,
        invalidatesTags: [{ type: 'Role', id: 'LIST' }],
      }),
      getRoles: builder.query<Roles.FindRoles.Response['data'], GetRolesParams | void>({
        query: ({ id, ...params } = {}) => ({
          url: `/admin/roles/${id ?? ''}`,
          method: 'GET',
          config: {
            params,
          },
        }),
        transformResponse: (res: Roles.FindRole.Response | Roles.FindRoles.Response) => {
          let roles: Roles.FindRoles.Response['data'] = [];

          if (res.data) {
            if (Array.isArray(res.data)) {
              roles = res.data;
            } else {
              roles = [res.data];
            }
          }

          return roles;
        },
        providesTags: (res, _err, arg) => {
          if (typeof arg === 'object' && 'id' in arg) {
            return [{ type: 'Role' as const, id: arg.id }];
          } else {
            return [
              ...(res?.map(({ id }) => ({ type: 'Role' as const, id })) ?? []),
              { type: 'Role' as const, id: 'LIST' },
            ];
          }
        },
      }),
      updateRole: builder.mutation<
        Roles.Update.Response['data'],
        Roles.Update.Request['body'] & Roles.Update.Request['params']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/roles/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (res: Roles.Create.Response) => res.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'Role' as const, id }],
      }),
      getRolePermissions: builder.query<
        Roles.GetPermissions.Response['data'],
        GetRolePermissionsParams
      >({
        query: ({ id, ...params }) => ({
          url: `/admin/roles/${id}/permissions`,
          method: 'GET',
          config: {
            params,
          },
        }),
        transformResponse: (res: Roles.GetPermissions.Response) => res.data,
        providesTags: (_res, _err, { id }) => [{ type: 'RolePermissions' as const, id }],
      }),
      updateRolePermissions: builder.mutation<
        Roles.UpdatePermissions.Response['data'],
        Roles.UpdatePermissions.Request['body'] & Roles.UpdatePermissions.Request['params']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/roles/${id}/permissions`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (res: Roles.UpdatePermissions.Response) => res.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'RolePermissions' as const, id }],
      }),
      /**
       * Permissions
       */
      getRolePermissionLayout: builder.query<
        Permissions.GetAll.Response['data'],
        Permissions.GetAll.Request['params']
      >({
        query: (params) => ({
          url: '/admin/permissions',
          method: 'GET',
          config: {
            params,
          },
        }),
        transformResponse: (res: Permissions.GetAll.Response) => res.data,
      }),
    }),
    overrideExisting: false,
  });

type GetUsersParams =
  | Users.FindOne.Params
  | (Users.FindAll.Request['query'] & { id?: never })
  | void;
type GetRolesParams =
  | Roles.FindRole.Request['params']
  | (Roles.FindRoles.Request['query'] & { id?: never });
interface GetRolePermissionsParams {
  id: Data.ID;
}

const {
  useCreateUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useDeleteManyUsersMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useGetRolePermissionsQuery,
  useGetRolePermissionLayoutQuery,
  useUpdateRolePermissionsMutation,
} = usersService;

const useAdminUsers = useGetUsersQuery;

export {
  useUpdateUserMutation,
  useGetRolesQuery,
  useAdminUsers,
  useDeleteManyUsersMutation,
  useCreateUserMutation,
  useGetRolePermissionsQuery,
  useGetRolePermissionLayoutQuery,
  useCreateRoleMutation,
  useUpdateRolePermissionsMutation,
  useUpdateRoleMutation,
};
export type { GetRolesParams, GetUsersParams, GetRolePermissionsParams };
