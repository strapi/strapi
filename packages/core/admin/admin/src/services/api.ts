import { createApi } from '@reduxjs/toolkit/query/react';

import { fetchBaseQuery } from '../utils/baseQuery';

/**
 * @public
 * @description This is the redux toolkit api for the admin panel, users
 * should use a combination of `enhanceEndpoints` to add their TagTypes
 * to utilise in their `injectEndpoints` construction for automatic cache
 * re-validation. Keep the base tag list small; `'Me'` is included so session
 * helpers can invalidate identity queries without casting. None of the
 * data-fetching looks for the StrapiApp are stored here either.
 */
const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: ['GuidedTourMeta', 'HomepageKeyStatistics', 'AiUsage', 'AiFeatureConfig', 'Me'],
  endpoints: () => ({}),
});

export { adminApi };
