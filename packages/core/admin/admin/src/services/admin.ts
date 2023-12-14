import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery } from '../utils/baseQuery';

import type { TelemetryProperties, Init } from '../../../shared/contracts/admin';

const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Me', 'User'],
  endpoints: (builder) => ({
    init: builder.query<Init.Response['data'], void>({
      query: () => ({
        url: '/admin/init',
        method: 'GET',
      }),
      transformResponse(res: Init.Response) {
        return res.data;
      },
    }),
    telemetryProperties: builder.query<TelemetryProperties.Response['data'], void>({
      query: () => ({
        url: '/admin/telemetry-properties',
        method: 'GET',
        config: {
          validateStatus: (status) => status < 500,
        },
      }),
      transformResponse(res: TelemetryProperties.Response) {
        return res.data;
      },
    }),
  }),
});

const { useInitQuery, useTelemetryPropertiesQuery } = adminApi;

export { adminApi, useInitQuery, useTelemetryPropertiesQuery };
