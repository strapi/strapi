import { createApi } from '@reduxjs/toolkit/query/react';

import { DocumentInfos } from '../types';
import { baseQuery } from '../utils/baseQuery';

type SettingsInput = {
  restrictedAccess: boolean;
  password: string;
};

const api = createApi({
  reducerPath: 'plugin::documentation',
  baseQuery: baseQuery(),
  tagTypes: ['DocumentInfo'],
  endpoints: (builder) => {
    return {
      getInfo: builder.query<DocumentInfos, void>({
        query: () => '/documentation/getInfos',
        providesTags: ['DocumentInfo'],
      }),

      deleteVersion: builder.mutation<void, { version: string }>({
        query: ({ version }) => ({
          url: `/documentation/deleteDoc/${version}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['DocumentInfo'],
      }),

      updateSettings: builder.mutation<void, { body: SettingsInput }>({
        query: ({ body }) => ({
          url: `/documentation/updateSettings`,
          method: 'PUT',
          data: body,
        }),
        invalidatesTags: ['DocumentInfo'],
      }),

      regenerateDoc: builder.mutation<void, { version: string }>({
        query: ({ version }) => ({
          url: `/documentation/regenerateDoc`,
          method: 'POST',
          data: { version },
        }),
      }),
    };
  },
});

export { api };

export const {
  useGetInfoQuery,
  useDeleteVersionMutation,
  useUpdateSettingsMutation,
  useRegenerateDocMutation,
} = api;
