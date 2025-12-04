import { adminApi } from '@strapi/admin/strapi-admin';

import { DocumentInfos, SettingsInput } from '../types';

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

        updateSettings: builder.mutation<void, { body: SettingsInput }>({
          query: ({ body }) => ({
            url: `/documentation/updateSettings`,
            method: 'PUT',
            data: body,
          }),
          invalidatesTags: ['DocumentInfo'],
        }),
      };
    },
  });

export const { useGetInfoQuery, useUpdateSettingsMutation } = api;
