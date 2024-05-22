import { adminApi } from '@strapi/admin/strapi-admin';

import { DocumentInfos } from '../types';

type SettingsInput = {
  restrictedAccess: boolean;
  password: string;
};

const api = adminApi
  .enhanceEndpoints({
    addTagTypes: ['DocumentInfo'],
  })
  .injectEndpoints({
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

export const {
  useGetInfoQuery,
  useDeleteVersionMutation,
  useUpdateSettingsMutation,
  useRegenerateDocMutation,
} = api;
