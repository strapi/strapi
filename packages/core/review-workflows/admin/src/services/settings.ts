import { reviewWorkflowsApi } from './api';

import type { Create, Update, Delete, GetAll } from '../../../shared/contracts/review-workflows';

const settingsApi = reviewWorkflowsApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<
      {
        workflows: GetAll.Response['data'];
        meta?: GetAll.Response['meta'];
      },
      GetWorkflowsParams | void
    >({
      query: (args) => {
        return {
          url: '/review-workflows/workflows',
          method: 'GET',
          config: {
            params: args ?? {},
          },
        };
      },
      transformResponse: (res: GetAll.Response) => {
        return {
          workflows: res.data,
          meta: 'meta' in res ? res.meta : undefined,
        };
      },
      providesTags: (res) => {
        return [
          ...(res?.workflows.map(({ id }) => ({ type: 'ReviewWorkflow' as const, id })) ?? []),
          { type: 'ReviewWorkflow' as const, id: 'LIST' },
        ];
      },
    }),
    createWorkflow: builder.mutation<Create.Response['data'], Create.Request['body']>({
      query: (data) => ({
        url: '/review-workflows/workflows',
        method: 'POST',
        data,
      }),
      transformResponse: (res: Create.Response) => res.data,
      invalidatesTags(res) {
        return [
          { type: 'ReviewWorkflow' as const, id: 'LIST' },
          'ReviewWorkflowStages',
          { type: 'Document', id: `ALL_LIST` },
          { type: 'ContentTypeSettings', id: 'LIST' },
          ...(res?.contentTypes.map((uid) => ({
            type: 'Document' as const,
            id: `${uid}_ALL_ITEMS`,
          })) ?? []),
        ];
      },
    }),
    updateWorkflow: builder.mutation<
      Update.Response['data'],
      Update.Request['body'] & Update.Params
    >({
      query: ({ id, ...data }) => ({
        url: `/review-workflows/workflows/${id}`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: Update.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [
        { type: 'ReviewWorkflow' as const, id: arg.id },
        'ReviewWorkflowStages',
        { type: 'Document', id: 'ALL_LIST' },
        { type: 'ContentTypeSettings', id: 'LIST' },
        ...(res?.contentTypes.map((uid) => ({
          type: 'Document' as const,
          id: `${uid}_ALL_ITEMS`,
        })) ?? []),
      ],
    }),
    deleteWorkflow: builder.mutation<Delete.Response['data'], Delete.Params>({
      query: ({ id }) => ({
        url: `/review-workflows/workflows/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (res: Delete.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [
        { type: 'ReviewWorkflow' as const, id: arg.id },
        'ReviewWorkflowStages',
        { type: 'Document', id: `ALL_LIST` },
        { type: 'ContentTypeSettings', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

type GetWorkflowsParams = GetAll.Request['query'];

const {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useUpdateWorkflowMutation,
} = settingsApi;

export {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useUpdateWorkflowMutation,
  type GetWorkflowsParams,
};
