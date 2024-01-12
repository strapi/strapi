/**
 * Related to the InputUID component, not the UIDs of content-types.
 */

import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { contentManagerApi } from './api';

const uidApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getDefaultUID: builder.query<
      Contracts.UID.GenerateUID.Response['data'],
      Contracts.UID.GenerateUID.Request['body']
    >({
      query: (data) => {
        return {
          url: '/content-manager/uid/generate',
          method: 'POST',
          body: data,
        };
      },
      transformResponse: (response: Contracts.UID.GenerateUID.Response) => response.data,
    }),
    generateUID: builder.mutation<
      Contracts.UID.GenerateUID.Response['data'],
      Contracts.UID.GenerateUID.Request['body']
    >({
      query: (data) => ({
        url: '/content-manager/uid/generate',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: Contracts.UID.GenerateUID.Response) => response.data,
    }),
    getAvailability: builder.query<
      Contracts.UID.CheckUIDAvailability.Response,
      Contracts.UID.CheckUIDAvailability.Request['body']
    >({
      query: (data) => ({
        url: '/content-manager/uid/check-availability',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

const { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery } = uidApi;

export { useGenerateUIDMutation, useGetDefaultUIDQuery, useGetAvailabilityQuery };
