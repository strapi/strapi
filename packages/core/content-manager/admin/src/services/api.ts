import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery, type UnknownApiError } from '../utils/api';

const contentManagerApi = createApi({
  reducerPath: 'contentManagerApi',
  baseQuery: axiosBaseQuery(),
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
