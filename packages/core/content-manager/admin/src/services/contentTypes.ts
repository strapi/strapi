import {
  FindContentTypeConfiguration,
  UpdateContentTypeConfiguration,
  FindContentTypesSettings,
} from '../../../shared/contracts/content-types';

import { contentManagerApi } from './api';

const contentTypesApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getContentTypeConfiguration: builder.query<
      FindContentTypeConfiguration.Response['data'],
      string
    >({
      query: (uid) => ({
        url: `/content-manager/content-types/${uid}/configuration`,
        method: 'GET',
      }),
      transformResponse: (response: FindContentTypeConfiguration.Response) => response.data,
      providesTags: (_result, _error, uid) => [
        { type: 'ContentTypesConfiguration', id: uid },
        { type: 'ContentTypeSettings', id: 'LIST' },
      ],
    }),
    getAllContentTypeSettings: builder.query<FindContentTypesSettings.Response['data'], void>({
      query: () => '/content-manager/content-types-settings',
      transformResponse: (response: FindContentTypesSettings.Response) => response.data,
      providesTags: [{ type: 'ContentTypeSettings', id: 'LIST' }],
    }),
    updateContentTypeConfiguration: builder.mutation<
      UpdateContentTypeConfiguration.Response['data'],
      UpdateContentTypeConfiguration.Request['body'] & {
        uid: string;
      }
    >({
      query: ({ uid, ...body }) => ({
        url: `/content-manager/content-types/${uid}/configuration`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (response: UpdateContentTypeConfiguration.Response) => response.data,
      invalidatesTags: (_result, _error, { uid }) => [
        { type: 'ContentTypesConfiguration', id: uid },
        { type: 'ContentTypeSettings', id: 'LIST' },
        // Is this necessary?
        { type: 'InitialData' },
      ],
    }),
  }),
});

const {
  useGetContentTypeConfigurationQuery,
  useGetAllContentTypeSettingsQuery,
  useUpdateContentTypeConfigurationMutation,
} = contentTypesApi;

export {
  useGetContentTypeConfigurationQuery,
  useGetAllContentTypeSettingsQuery,
  useUpdateContentTypeConfigurationMutation,
};
