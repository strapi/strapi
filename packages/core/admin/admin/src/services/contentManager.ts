/**
 * This will 100% be moved into it's own reducer space when
 * we move the content-manager back to it's plugin.
 */

import { adminApi } from './api';

import type { ContentType } from '../../../shared/contracts/content-types';

const contentManager = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Content Types
     */
    getContentTypes: builder.query<ContentType[], void>({
      query: () => ({
        url: `/content-manager/content-types`,
        method: 'GET',
      }),
      transformResponse: (res: { data: ContentType[] }) => res.data,
    }),
  }),
  overrideExisting: false,
});

const { useGetContentTypesQuery } = contentManager;

export { useGetContentTypesQuery };
