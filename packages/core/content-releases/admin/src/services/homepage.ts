import { adminApi } from '@strapi/admin/strapi-admin';

import * as Homepage from '../../../shared/contracts/homepage';

import type { Contracts } from '@strapi/content-manager/_internal/shared';

type ContentType = Contracts.ContentTypes.ContentType;
interface ContentTypes {
  collectionType: ContentType[];
  singleType: ContentType[];
}

const contentManagerApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['UpcomingReleasesList'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getUpcomingReleases: builder.query<Homepage.GetUpcomingReleases.Response['data'], void>({
        query: () => '/content-releases/homepage/upcoming-releases',
        transformResponse: (response: Homepage.GetUpcomingReleases.Response) => response.data,
        providesTags: (_, _err) => ['UpcomingReleasesList'],
      }),
    }),
    overrideExisting: true,
  });

const { useGetUpcomingReleasesQuery } = contentManagerApi;

export { useGetUpcomingReleasesQuery };
export type { ContentTypes, ContentType };
