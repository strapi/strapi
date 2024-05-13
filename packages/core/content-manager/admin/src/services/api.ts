import { createApi } from '@reduxjs/toolkit/query/react';

import { fetchBaseQuery, type UnknownApiError } from '../utils/api';

const contentManagerApi = createApi({
  reducerPath: 'contentManagerApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: [
    'ComponentConfiguration',
    'ContentTypesConfiguration',
    'ContentTypeSettings',
    'Document',
    'InitialData',
    'HistoryVersion',
    'Relations',
  ],
  endpoints: () => ({}),
});

export { contentManagerApi, type UnknownApiError };
