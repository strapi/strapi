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
  tagTypes: ['DocumentInfos'],
  endpoints: (builder) => {
    return {
      getInfos: builder.query<DocumentInfos, void>({
        query: () => '/documentation/getInfos',
        providesTags: ['DocumentInfos'],
      }),

      deleteVersion: builder.mutation<void, { version: string }>({
        query: ({ version }) => ({
          url: `/documentation/deleteDoc/${version}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['DocumentInfos'],
      }),

      updateSettings: builder.mutation<void, { body: SettingsInput }>({
        query: ({ body }) => ({
          url: `/documentation/updateSettings`,
          method: 'PUT',
          data: body,
        }),
        invalidatesTags: ['DocumentInfos'],
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
  useGetInfosQuery,
  useDeleteVersionMutation,
  useUpdateSettingsMutation,
  useRegenerateDocMutation,
} = api;
