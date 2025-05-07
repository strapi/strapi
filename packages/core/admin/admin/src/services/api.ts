import { createApi, fetchBaseQuery as baseFetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { fetchBaseQuery } from '../utils/baseQuery';

/**
 * @public
 * @description This is the redux toolkit api for the admin panel, users
 * should use a combination of `enhanceEndpoints` to add their TagTypes
 * to utilise in their `injectEndpoints` construction for automatic cache
 * re-validation. We specifically do not store any tagTypes by default leaving
 * the API surface as small as possible. None of the data-fetching looks for the
 * StrapiApp are stored here either.
 */
const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: [],
  endpoints: () => ({}),
});

const licenseRegistryApi = createApi({
  reducerPath: 'licenseRegistryApi',
  baseQuery: baseFetchBaseQuery({
    // TODO: use the env variable (STRAPI_LICENSE_REGISTRY_API_URL) for this
    baseUrl: 'http://localhost:4007/api',
  }),
  endpoints: () => ({}),
});

export { adminApi, licenseRegistryApi };
