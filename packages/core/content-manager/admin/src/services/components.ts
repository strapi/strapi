import {
  normalizeComponentConfigurationResponse,
  normalizeComponentConfigurationUpdateResponse,
} from '../utils/layouts/normalizeContentManagerLayout';

import { contentManagerApi } from './api';

import type {
  FindComponentConfiguration,
  UpdateComponentConfiguration,
} from '../../../shared/contracts/components';

const componentsApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getComponentConfiguration: builder.query<
      FindComponentConfiguration.Response['data'],
      FindComponentConfiguration.Params['uid']
    >({
      query: (uid) => `/content-manager/components/${uid}/configuration`,
      transformResponse: (response: FindComponentConfiguration.Response, _meta, uid) =>
        normalizeComponentConfigurationResponse(response.data, uid),
      providesTags: (_result, _error, uid) => [{ type: 'ComponentConfiguration', id: uid }],
    }),
    updateComponentConfiguration: builder.mutation({
      query: ({ uid, ...body }) => ({
        url: `/content-manager/components/${uid}/configuration`,
        method: 'PUT',
        data: body,
      }),
      transformResponse: (response: UpdateComponentConfiguration.Response) =>
        normalizeComponentConfigurationUpdateResponse(response.data),
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
