import { createApi } from '@reduxjs/toolkit/query/react';

import { fetchBaseQuery, type UnknownApiError } from '../utils/baseQuery';

const i18nApi = createApi({
  reducerPath: 'i18nApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: ['Locale'],
  endpoints: () => ({}),
});

export { i18nApi, type UnknownApiError };
