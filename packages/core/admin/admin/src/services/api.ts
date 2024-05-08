import { createApi } from '@reduxjs/toolkit/query/react';

import { TokenRegenerate } from '../../../shared/contracts/transfer';
import { fetchBaseQuery, type UnknownApiError } from '../utils/baseQuery';

const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: [
    'ApiToken',
    'LicenseLimits',
    'Me',
    'ProjectSettings',
    'ProvidersOptions',
    'Role',
    'RolePermissions',
    'TransferToken',
    'User',
    'Webhook',
  ],
  endpoints: (builder) => ({
    /**
     * This is here because it's shared between the transfer-token routes & the api-tokens.
     */
    regenerateToken: builder.mutation<TokenRegenerate.Response['data'], string>({
      query: (url) => ({
        method: 'POST',
        url: `${url}/regenerate`,
      }),
      transformResponse: (response: TokenRegenerate.Response) => response.data,
    }),
  }),
});

const { useRegenerateTokenMutation } = adminApi;

export { adminApi, type UnknownApiError, useRegenerateTokenMutation };
