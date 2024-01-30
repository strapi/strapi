/**
 * Related to the InputUID component, not the UIDs of content-types.
 */

import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { contentManagerApi } from './api';

const uidApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getDefaultUID: builder.query<
      Contracts.UID.GenerateUID.Response['data'],
      Contracts.UID.GenerateUID.Request['body'] & {
        params: Contracts.UID.GenerateUID.Request['query'];
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
      transformResponse: (response: Contracts.UID.GenerateUID.Response) => response.data,
    }),
    generateUID: builder.mutation<
      Contracts.UID.GenerateUID.Response['data'],
      Contracts.UID.GenerateUID.Request['body'] & {
        params: Contracts.UID.GenerateUID.Request['query'];
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
      transformResponse: (response: Contracts.UID.GenerateUID.Response) => response.data,
    }),
    getAvailability: builder.query<
      Contracts.UID.CheckUIDAvailability.Response,
      Contracts.UID.CheckUIDAvailability.Request['body'] & {
        params: Contracts.UID.CheckUIDAvailability.Request['query'];
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
    }),
  }),
});

const { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery } = uidApi;

export { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery };
