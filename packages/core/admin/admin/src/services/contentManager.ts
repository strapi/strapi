/**
 * This will 100% be moved into it's own reducer space when
 * we move the content-manager back to it's plugin.
 */

import { adminApi } from './api';

import type { ContentType } from '../../../shared/contracts/content-types';
interface ContentTypes {
  collectionType: ContentType[];
  singleType: ContentType[];
}

const contentManager = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Content Types
     */
    getContentTypes: builder.query<ContentTypes, void>({
      query: () => ({
        url: `/content-manager/content-types`,
        method: 'GET',
      }),
      transformResponse: (res: { data: ContentType[] }) => {
        return res.data.reduce<ContentTypes>(
          (acc, curr) => {
            if (curr.isDisplayed) {
              acc[curr.kind].push(curr);
            }
            return acc;
          },
          {
            collectionType: [],
            singleType: [],
          }
        );
      },
    }),
  }),
  overrideExisting: true,
});

const { useGetContentTypesQuery } = contentManager;

export { useGetContentTypesQuery };
