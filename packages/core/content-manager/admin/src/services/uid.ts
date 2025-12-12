/**
 * Related to the InputUID component, not the UIDs of content-types.
 */

import { contentManagerApi } from '@content-manager/admin/services/api';
import { GenerateUID, CheckUIDAvailability } from '@content-manager/shared/contracts/uid';

const uidApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getDefaultUID: builder.query<
      GenerateUID.Response['data'],
      GenerateUID.Request['body'] & {
        params: GenerateUID.Request['query'];
      }
    >({
      query: ({ params, ...data }) => {
        return {
          url: '/content-manager/uid/generate',
          method: 'POST',
          data,
          config: {
            params,
          },
        };
      },
      transformResponse: (response: GenerateUID.Response) => response.data,
    }),
    generateUID: builder.mutation<
      GenerateUID.Response['data'],
      GenerateUID.Request['body'] & {
        params: GenerateUID.Request['query'];
      }
    >({
      query: ({ params, ...data }) => ({
        url: '/content-manager/uid/generate',
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      transformResponse: (response: GenerateUID.Response) => response.data,
    }),
    getAvailability: builder.query<
      CheckUIDAvailability.Response,
      CheckUIDAvailability.Request['body'] & {
        params: CheckUIDAvailability.Request['query'];
      }
    >({
      query: ({ params, ...data }) => ({
        url: '/content-manager/uid/check-availability',
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      providesTags: (_res, _error, params) => [
        { type: 'UidAvailability', id: params.contentTypeUID },
      ],
    }),
  }),
});

const { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery } = uidApi;

export { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery };
