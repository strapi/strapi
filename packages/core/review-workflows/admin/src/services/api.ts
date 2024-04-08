import { createApi } from '@reduxjs/toolkit/query/react';

import { fetchBaseQuery, type UnknownApiError } from '../utils/api';

const reviewWorkflowsApi = createApi({
  reducerPath: 'reviewWorkflowsApi',
  baseQuery: fetchBaseQuery(),
  tagTypes: ['ReviewWorkflow', 'ReviewWorkflowStage'],
  endpoints: () => ({}),
});

export { reviewWorkflowsApi, type UnknownApiError };
