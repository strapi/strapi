import * as ApiToken from '../../../shared/contracts/api-token';

import { adminApi } from './api';

const apiTokensService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['ApiToken'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getAPITokens: builder.query<ApiToken.List.Response['data'], void>({
        query: () => '/admin/api-tokens',
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
        invalidatesTags: [{ type: 'ApiToken' as const, id: 'LIST' }],
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
        invalidatesTags: (_res, _err, id) => [{ type: 'ApiToken' as const, id }],
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
    }),
  });

const {
  useGetAPITokensQuery,
  useGetAPITokenQuery,
  useCreateAPITokenMutation,
  useDeleteAPITokenMutation,
  useUpdateAPITokenMutation,
} = apiTokensService;

export {
  useGetAPITokensQuery,
  useGetAPITokenQuery,
  useCreateAPITokenMutation,
  useDeleteAPITokenMutation,
  useUpdateAPITokenMutation,
};
