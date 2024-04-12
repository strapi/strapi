import { createApi } from '@reduxjs/toolkit/query/react';

import { axiosBaseQuery, type UnknownApiError } from '../utils/api';

const reviewWorkflowsApi = createApi({
  reducerPath: 'reviewWorkflowsApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['ReviewWorkflow', 'ReviewWorkflowStages'],
  endpoints: () => ({}),
});

export { reviewWorkflowsApi, type UnknownApiError };
