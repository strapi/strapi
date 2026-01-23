import * as AppToken from '../../../shared/contracts/app-token';

import { adminApi } from './api';

import type { Permission } from '../../../shared/contracts/shared';

const appTokensService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['AppToken'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getAppTokens: builder.query<AppToken.List.Response['data'], void>({
        query: () => '/admin/users/me/app-tokens',
        transformResponse: (response: AppToken.List.Response) => response.data,
        providesTags: (res, _err) => [
          ...(res?.map(({ id }) => ({ type: 'AppToken' as const, id })) ?? []),
          { type: 'AppToken' as const, id: 'LIST' },
        ],
      }),
      getAppToken: builder.query<AppToken.Get.Response['data'], AppToken.Get.Params['id']>({
        query: (id) => `/admin/users/me/app-tokens/${id}`,
        transformResponse: (response: AppToken.Get.Response) => response.data,
        providesTags: (res, _err, id) => [{ type: 'AppToken' as const, id }],
      }),
      createAppToken: builder.mutation<
        AppToken.Create.Response['data'],
        AppToken.Create.Request['body']
      >({
        query: (body) => ({
          url: '/admin/users/me/app-tokens',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: AppToken.Create.Response) => response.data,
        invalidatesTags: [{ type: 'AppToken' as const, id: 'LIST' }],
      }),
      deleteAppToken: builder.mutation<
        AppToken.Revoke.Response['data'],
        AppToken.Revoke.Params['id']
      >({
        query: (id) => ({
          url: `/admin/users/me/app-tokens/${id}`,
          method: 'DELETE',
        }),
        transformResponse: (response: AppToken.Revoke.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [{ type: 'AppToken' as const, id }],
      }),
      updateAppToken: builder.mutation<
        AppToken.Update.Response['data'],
        AppToken.Update.Params & AppToken.Update.Request['body']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/users/me/app-tokens/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: AppToken.Update.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'AppToken' as const, id }],
      }),
      regenerateAppToken: builder.mutation<
        AppToken.Regenerate.Response['data'],
        AppToken.Regenerate.Params['id']
      >({
        query: (id) => ({
          url: `/admin/users/me/app-tokens/${id}/regenerate`,
          method: 'POST',
        }),
        transformResponse: (response: AppToken.Regenerate.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [{ type: 'AppToken' as const, id }],
      }),
      getAppTokenPermissions: builder.query<
        Permission[],
        AppToken.GetPermissions.Request['params']['id']
      >({
        query: (id) => `/admin/users/me/app-tokens/${id}/permissions`,
        transformResponse: (response: AppToken.GetPermissions.Response) => response.data,
      }),
      updateAppTokenPermissions: builder.mutation<
        Permission[],
        AppToken.UpdatePermissions.Request['params'] & AppToken.UpdatePermissions.Request['body']
      >({
        query: ({ id, permissions }) => ({
          url: `/admin/users/me/app-tokens/${id}/permissions`,
          method: 'PUT',
          data: { permissions },
        }),
        transformResponse: (response: AppToken.UpdatePermissions.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'AppToken' as const, id }],
      }),
    }),
  });

const {
  useGetAppTokensQuery,
  useGetAppTokenQuery,
  useCreateAppTokenMutation,
  useDeleteAppTokenMutation,
  useUpdateAppTokenMutation,
  useRegenerateAppTokenMutation,
  useGetAppTokenPermissionsQuery,
  useUpdateAppTokenPermissionsMutation,
} = appTokensService;

export {
  useGetAppTokensQuery,
  useGetAppTokenQuery,
  useCreateAppTokenMutation,
  useDeleteAppTokenMutation,
  useUpdateAppTokenMutation,
  useRegenerateAppTokenMutation,
  useGetAppTokenPermissionsQuery,
  useUpdateAppTokenPermissionsMutation,
};
