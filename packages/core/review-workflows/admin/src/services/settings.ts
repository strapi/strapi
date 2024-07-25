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
      // @ts-expect-error - FIXME: TS isn't aware that "ContentTypesConfiguration" was added as a tag
      invalidatesTags(result) {
        return [
          { type: 'ReviewWorkflow' as const, id: 'LIST' },
          'ReviewWorkflowStages',
          result?.contentTypes.map((uid) => ({
            type: 'ContentTypesConfiguration',
            id: uid,
          })) ?? [],
          // Invalidate all documents so both list and edit views get the updated workflow data
          { type: 'Document' },
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
      // @ts-expect-error - FIXME: TS isn't aware that "ContentTypesConfiguration" and "Document" were added as a tag
      invalidatesTags: (res, _err, arg) => [
        { type: 'ReviewWorkflow' as const, id: arg.id },
        'ReviewWorkflowStages',
        // For each affected content type, refetch the configuration
        res?.contentTypes.map((uid) => ({
          type: 'ContentTypesConfiguration',
          id: uid,
        })) ?? [],
        // Invalidate all documents so both list and edit views get the updated workflow data
        { type: 'Document' },
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
