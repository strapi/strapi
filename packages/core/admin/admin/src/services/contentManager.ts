/**
 * This will 100% be moved into it's own reducer space when
 * we move the content-manager back to it's plugin.
 */

import { adminApi } from './api';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const contentManager = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Components
     */
    getComponents: builder.query<Contracts.Components.FindComponents.Response['data'], void>({
      query: () => ({
        url: `/content-manager/components`,
        method: 'GET',
      }),
      transformResponse: (res: Contracts.Components.FindComponents.Response) => res.data,
    }),
    /**
     * Content Types
     */
    getContentTypes: builder.query<Contracts.ContentTypes.FindContentTypes.Response['data'], void>({
      query: () => ({
        url: `/content-manager/content-types`,
        method: 'GET',
      }),
      transformResponse: (res: Contracts.ContentTypes.FindContentTypes.Response) => res.data,
    }),
  }),
  overrideExisting: false,
});

const { useGetComponentsQuery, useGetContentTypesQuery } = contentManager;

export { useGetComponentsQuery, useGetContentTypesQuery };
