import * as ServiceAccount from '../../../shared/contracts/service-account';

import { adminApi } from './api';

const serviceAccountsService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['ServiceAccount'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getServiceAccounts: builder.query<ServiceAccount.List.Response['data'], void>({
        query: () => '/admin/service-accounts',
        transformResponse: (response: ServiceAccount.List.Response) => response.data,
        providesTags: (res, _err) => [
          ...(res?.map(({ id }) => ({ type: 'ServiceAccount' as const, id })) ?? []),
          { type: 'ServiceAccount' as const, id: 'LIST' },
        ],
      }),
      getServiceAccount: builder.query<
        ServiceAccount.Get.Response['data'],
        ServiceAccount.Get.Params['id']
      >({
        query: (id) => `/admin/service-accounts/${id}`,
        transformResponse: (response: ServiceAccount.Get.Response) => response.data,
        providesTags: (res, _err, id) => [{ type: 'ServiceAccount' as const, id }],
      }),
      createServiceAccount: builder.mutation<
        ServiceAccount.Create.Response['data'],
        ServiceAccount.Create.Request['body']
      >({
        query: (body) => ({
          url: '/admin/service-accounts',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: ServiceAccount.Create.Response) => response.data,
        invalidatesTags: [
          { type: 'ServiceAccount' as const, id: 'LIST' },
          'HomepageKeyStatistics',
        ],
      }),
      deleteServiceAccount: builder.mutation<
        ServiceAccount.Revoke.Response['data'],
        ServiceAccount.Revoke.Params['id']
      >({
        query: (id) => ({
          url: `/admin/service-accounts/${id}`,
          method: 'DELETE',
        }),
        transformResponse: (response: ServiceAccount.Revoke.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [
          { type: 'ServiceAccount' as const, id },
          'HomepageKeyStatistics',
        ],
      }),
      updateServiceAccount: builder.mutation<
        ServiceAccount.Update.Response['data'],
        ServiceAccount.Update.Params & ServiceAccount.Update.Request['body']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/service-accounts/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: ServiceAccount.Update.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'ServiceAccount' as const, id }],
      }),
      regenerateServiceAccount: builder.mutation<
        ServiceAccount.Get.Response['data'],
        ServiceAccount.Get.Params['id']
      >({
        query: (id) => ({
          url: `/admin/service-accounts/${id}/regenerate`,
          method: 'POST',
        }),
        transformResponse: (response: ServiceAccount.Get.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [{ type: 'ServiceAccount' as const, id }],
      }),
    }),
  });

const {
  useGetServiceAccountsQuery,
  useGetServiceAccountQuery,
  useCreateServiceAccountMutation,
  useDeleteServiceAccountMutation,
  useUpdateServiceAccountMutation,
  useRegenerateServiceAccountMutation,
} = serviceAccountsService;

export {
  useGetServiceAccountsQuery,
  useGetServiceAccountQuery,
  useCreateServiceAccountMutation,
  useDeleteServiceAccountMutation,
  useUpdateServiceAccountMutation,
  useRegenerateServiceAccountMutation,
};

