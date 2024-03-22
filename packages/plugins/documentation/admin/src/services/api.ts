import { createApi } from '@reduxjs/toolkit/query/react';

import { DocumentInfos } from '../types';
import { axiosBaseQuery } from '../utils/baseQuery';

type SettingsInput = {
  restrictedAccess: boolean;
  password: string;
};

const api = createApi({
  reducerPath: 'plugin::documentation',
  baseQuery: axiosBaseQuery({
    baseURL: '/documentation',
  }),
  tagTypes: ['DocumentInfos'],
  endpoints: (builder) => {
    return {
      getInfos: builder.query<DocumentInfos, void>({
        query: () => '/getInfos',
        providesTags: ['DocumentInfos'],
      }),

      deleteVersion: builder.mutation<void, { version: string }>({
        query: ({ version }) => ({
          url: `/deleteDoc/${version}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['DocumentInfos'],
      }),

      updateSettings: builder.mutation<void, { body: SettingsInput }>({
        query: ({ body }) => ({
          url: `/updateSettings`,
          method: 'PUT',
          data: body,
        }),
        invalidatesTags: ['DocumentInfos'],
      }),

      regenerateDoc: builder.mutation<void, { version: string }>({
        query: ({ version }) => ({
          url: `/regenerateDoc`,
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
