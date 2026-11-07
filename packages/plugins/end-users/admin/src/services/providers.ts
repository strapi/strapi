import { endUsersApi } from './api';

import type {
  ProviderCreateBody,
  ProviderDetail,
  ProviderResponse,
  ProvidersResponse,
  ProviderSummary,
  ProviderUpdateBody,
} from '../../../shared/contracts/providers';

interface UpdateProviderArgs {
  id: string;
  body: ProviderUpdateBody;
}

/**
 * The sign-in providers. A save the server refused changes nothing, so the cache is left alone and
 * the modal keeps what was typed; one that went through refreshes the list and the provider.
 */
const providersApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersProviders: builder.query<ProviderSummary[], void>({
      query: () => '/end-users/providers',
      transformResponse: (response: ProvidersResponse) => response.data,
      providesTags: [{ type: 'EndUsersProvider', id: 'LIST' }],
    }),
    getEndUsersProvider: builder.query<ProviderDetail, string>({
      query: (id) => `/end-users/providers/${id}`,
      transformResponse: (response: ProviderResponse) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'EndUsersProvider', id }],
    }),
    updateEndUsersProvider: builder.mutation<ProviderDetail, UpdateProviderArgs>({
      query: ({ id, body }) => ({ url: `/end-users/providers/${id}`, method: 'PUT', data: body }),
      transformResponse: (response: ProviderResponse) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'EndUsersProvider', id },
        { type: 'EndUsersProvider', id: 'LIST' },
      ],
    }),
    createEndUsersProvider: builder.mutation<ProviderDetail, ProviderCreateBody>({
      query: (body) => ({ url: '/end-users/providers', method: 'POST', data: body }),
      transformResponse: (response: ProviderResponse) => response.data,
      invalidatesTags: [{ type: 'EndUsersProvider', id: 'LIST' }],
    }),
    deleteEndUsersProvider: builder.mutation<void, string>({
      query: (id) => ({ url: `/end-users/providers/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'EndUsersProvider', id },
        { type: 'EndUsersProvider', id: 'LIST' },
      ],
    }),
  }),
});

const {
  useGetEndUsersProvidersQuery: useGetProvidersQuery,
  useGetEndUsersProviderQuery: useGetProviderQuery,
  useUpdateEndUsersProviderMutation: useUpdateProviderMutation,
  useCreateEndUsersProviderMutation: useCreateProviderMutation,
  useDeleteEndUsersProviderMutation: useDeleteProviderMutation,
} = providersApi;

export {
  useCreateProviderMutation,
  useDeleteProviderMutation,
  useGetProviderQuery,
  useGetProvidersQuery,
  useUpdateProviderMutation,
};
