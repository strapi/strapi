import { contentManagerApi } from './api';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const componentsApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getComponentConfiguration: builder.query<
      Contracts.Components.FindComponentConfiguration.Response['data'],
      Contracts.Components.FindComponentConfiguration.Params['uid']
    >({
      query: (uid) => `/content-manager/components/${uid}/configuration`,
      transformResponse: (response: Contracts.Components.FindComponentConfiguration.Response) =>
        response.data,
      providesTags: (_result, _error, uid) => [{ type: 'ComponentConfiguration', id: uid }],
    }),
    updateComponentConfiguration: builder.mutation({
      query: ({ uid, ...body }) => ({
        url: `/content-manager/components/${uid}/configuration`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (response: Contracts.Components.UpdateComponentConfiguration.Response) =>
        response.data,
      invalidatesTags: (_result, _error, { uid }) => [
        { type: 'ComponentConfiguration', id: uid },
        // otherwise layouts already fetched will have stale component configuration data.
        { type: 'ContentTypeSettings', id: 'LIST' },
      ],
    }),
  }),
});

const { useGetComponentConfigurationQuery, useUpdateComponentConfigurationMutation } =
  componentsApi;

export { useGetComponentConfigurationQuery, useUpdateComponentConfigurationMutation };
