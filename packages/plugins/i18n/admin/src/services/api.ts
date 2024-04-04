import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery, type UnknownApiError } from '../utils/baseQuery';

const i18nApi = createApi({
  reducerPath: 'i18nApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['Locale'],
  endpoints: () => ({}),
});

export { i18nApi, type UnknownApiError };
