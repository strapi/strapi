import * as TransferTokens from '../../../shared/contracts/transfer';

import { adminApi } from './api';

const transferTokenService = adminApi
  .enhanceEndpoints({
    addTagTypes: ['TransferToken'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      regenerateToken: builder.mutation<TransferTokens.TokenRegenerate.Response['data'], string>({
        query: (url) => ({
          method: 'POST',
          url: `${url}/regenerate`,
        }),
        transformResponse: (response: TransferTokens.TokenRegenerate.Response) => response.data,
      }),
      getTransferTokens: builder.query<TransferTokens.TokenList.Response['data'], void>({
        query: () => ({
          url: '/admin/transfer/tokens',
          method: 'GET',
        }),
        transformResponse: (response: TransferTokens.TokenList.Response) => response.data,
        providesTags: (res, _err) => [
          ...(res?.map(({ id }) => ({ type: 'TransferToken' as const, id })) ?? []),
          { type: 'TransferToken' as const, id: 'LIST' },
        ],
      }),
      getTransferToken: builder.query<
        TransferTokens.TokenGetById.Response['data'],
        TransferTokens.TokenGetById.Params['id']
      >({
        query: (id) => `/admin/transfer/tokens/${id}`,
        transformResponse: (response: TransferTokens.TokenGetById.Response) => response.data,
        providesTags: (res, _err, id) => [{ type: 'TransferToken' as const, id }],
      }),
      createTransferToken: builder.mutation<
        TransferTokens.TokenCreate.Response['data'],
        TransferTokens.TokenCreate.Request['body']
      >({
        query: (body) => ({
          url: '/admin/transfer/tokens',
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: TransferTokens.TokenCreate.Response) => response.data,
        invalidatesTags: [{ type: 'TransferToken' as const, id: 'LIST' }],
      }),
      deleteTransferToken: builder.mutation<
        TransferTokens.TokenRevoke.Response['data'],
        TransferTokens.TokenRevoke.Params['id']
      >({
        query: (id) => ({
          url: `/admin/transfer/tokens/${id}`,
          method: 'DELETE',
        }),
        transformResponse: (response: TransferTokens.TokenRevoke.Response) => response.data,
        invalidatesTags: (_res, _err, id) => [{ type: 'TransferToken' as const, id }],
      }),
      updateTransferToken: builder.mutation<
        TransferTokens.TokenUpdate.Response['data'],
        TransferTokens.TokenUpdate.Params & TransferTokens.TokenUpdate.Request['body']
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/transfer/tokens/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: TransferTokens.TokenUpdate.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'TransferToken' as const, id }],
      }),
    }),
    overrideExisting: false,
  });

const {
  useGetTransferTokensQuery,
  useGetTransferTokenQuery,
  useCreateTransferTokenMutation,
  useDeleteTransferTokenMutation,
  useUpdateTransferTokenMutation,
  useRegenerateTokenMutation,
} = transferTokenService;

export {
  useGetTransferTokensQuery,
  useGetTransferTokenQuery,
  useCreateTransferTokenMutation,
  useDeleteTransferTokenMutation,
  useUpdateTransferTokenMutation,
  useRegenerateTokenMutation,
};
