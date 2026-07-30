import * as AdminToken from '../../../shared/contracts/admin-token';
import * as ApiToken from '../../../shared/contracts/api-token';

import { adminApi } from './api';

const apiTokensService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['ApiToken'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getAPITokens: builder.query<
        ApiToken.List.Response['data'],
        ApiToken.List.Request['query'] | void
      >({
        query: () => ({
          url: '/admin/api-tokens',
          method: 'GET',
        }),
        transformResponse: (response: ApiToken.List.Response) => response.data,
        providesTags: (res, _err) => [
          ...(res?.map(({ id }) => ({ type: 'ApiToken' as const, id })) ?? []),
          { type: 'ApiToken' as const, id: 'LIST' },
        ],
      }),
      getAPIToken: builder.query<ApiToken.Get.Response['data'], ApiToken.Get.Params['id']>({
        query: (id) => `/admin/api-tokens/${id}`,
        transformResponse: (response: ApiToken.Get.Response) => response.data,
        providesTags: (res, _err, id) => [{ type: 'ApiToken' as const, id }],
      }),
      createAPIToken: builder.mutation<
        ApiToken.Create.Response['data'],
        ApiToken.Create.Request['body']
      >({
        query: (body) => ({
          url: '/admin/api-tokens',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: ApiToken.Create.Response) => response.data,
        invalidatesTags: [{ type: 'ApiToken' as const, id: 'LIST' }, 'HomepageKeyStatistics'],
      }),
      deleteAPIToken: builder.mutation<
        ApiToken.Revoke.Response['data'],
        ApiToken.Revoke.Params['id']
      >({
        query: (id) => ({
          url: `/admin/api-tokens/${id}`,
          method: 'DELETE',
        }),
        transformResponse: (response: ApiToken.Revoke.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [
          { type: 'ApiToken' as const, id },
          'HomepageKeyStatistics',
        ],
      }),
      updateAPIToken: builder.mutation<
        ApiToken.Update.Response['data'],
        ApiToken.Update.Params & ApiToken.Update.Request['body']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/api-tokens/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: ApiToken.Update.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'ApiToken' as const, id }],
      }),
      getAPITokenOwnerPermissions: builder.query<
        AdminToken.GetOwnerPermissions.Response['data'],
        string
      >({
        query: (id) => `/admin/admin-tokens/${id}/owner-permissions`,
        transformResponse: (response: AdminToken.GetOwnerPermissions.Response) => response.data,
      }),
      getAdminTokens: builder.query<AdminToken.List.Response['data'], void>({
        query: () => ({
          url: '/admin/admin-tokens',
          method: 'GET',
        }),
        transformResponse: (response: AdminToken.List.Response) => response.data,
        providesTags: (res, _err) => [
          ...(res?.map(({ id }) => ({ type: 'ApiToken' as const, id })) ?? []),
          { type: 'ApiToken' as const, id: 'ADMIN_LIST' },
        ],
      }),
      getAdminToken: builder.query<AdminToken.Get.Response['data'], AdminToken.Get.Params['id']>({
        query: (id) => `/admin/admin-tokens/${id}`,
        transformResponse: (response: AdminToken.Get.Response) => response.data,
        providesTags: (res, _err, id) => [{ type: 'ApiToken' as const, id }],
      }),
      createAdminToken: builder.mutation<
        AdminToken.Create.Response['data'],
        AdminToken.Create.Request['body']
      >({
        query: (body) => ({
          url: '/admin/admin-tokens',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: AdminToken.Create.Response) => response.data,
        invalidatesTags: [{ type: 'ApiToken' as const, id: 'ADMIN_LIST' }, 'HomepageKeyStatistics'],
      }),
      deleteAdminToken: builder.mutation<
        AdminToken.Revoke.Response['data'],
        AdminToken.Revoke.Params['id']
      >({
        query: (id) => ({
          url: `/admin/admin-tokens/${id}`,
          method: 'DELETE',
        }),
        transformResponse: (response: AdminToken.Revoke.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [
          { type: 'ApiToken' as const, id },
          'HomepageKeyStatistics',
        ],
      }),
      updateAdminToken: builder.mutation<
        AdminToken.Update.Response['data'],
        AdminToken.Update.Params & AdminToken.Update.Request['body']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/admin-tokens/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: AdminToken.Update.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'ApiToken' as const, id }],
      }),
    }),
  });

const {
  useGetAPITokensQuery,
  useGetAPITokenQuery,
  useCreateAPITokenMutation,
  useDeleteAPITokenMutation,
  useUpdateAPITokenMutation,
  useGetAPITokenOwnerPermissionsQuery,
  useGetAdminTokensQuery,
  useGetAdminTokenQuery,
  useCreateAdminTokenMutation,
  useDeleteAdminTokenMutation,
  useUpdateAdminTokenMutation,
} = apiTokensService;

export {
  useGetAPITokensQuery,
  useGetAPITokenQuery,
  useCreateAPITokenMutation,
  useDeleteAPITokenMutation,
  useUpdateAPITokenMutation,
  useGetAPITokenOwnerPermissionsQuery,
  useGetAdminTokensQuery,
  useGetAdminTokenQuery,
  useCreateAdminTokenMutation,
  useDeleteAdminTokenMutation,
  useUpdateAdminTokenMutation,
};
