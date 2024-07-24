import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

import { adminApi } from '../../../../admin/src/services/api';
import * as ReviewWorkflows from '../../../../shared/contracts/review-workflows';

const reviewWorkflowsApi = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflows: builder.query<
      {
        workflows: ReviewWorkflows.GetAll.Response['data'];
        meta?: ReviewWorkflows.GetAll.Response['meta'];
      },
      GetWorkflowsParams | void
    >({
      query: (args) => {
        const { id, ...params } = args ?? {};

        return {
          url: `/admin/review-workflows/workflows/${id ?? ''}`,
          method: 'GET',
          config: {
            params,
          },
        };
      },
      transformResponse: (res: ReviewWorkflows.GetAll.Response | ReviewWorkflows.Get.Response) => {
        let workflows: ReviewWorkflows.GetAll.Response['data'] = [];

        if (Array.isArray(res.data)) {
          workflows = res.data;
        } else {
          workflows = [res.data];
        }

        return {
          workflows,
          meta: 'meta' in res ? res.meta : undefined,
        };
      },
      providesTags: (res, _err, arg) => {
        if (typeof arg === 'object' && 'id' in arg && arg.id !== '') {
          return [{ type: 'ReviewWorkflow' as const, id: arg.id }];
        } else {
          return [
            ...(res?.workflows.map(({ id }) => ({ type: 'ReviewWorkflow' as const, id })) ?? []),
            { type: 'ReviewWorkflow' as const, id: 'LIST' },
          ];
        }
      },
    }),
    createWorkflow: builder.mutation<
      ReviewWorkflows.Create.Response['data'],
      ReviewWorkflows.Create.Request['body']
    >({
      query: (data) => ({
        url: '/admin/review-workflows/workflows',
        method: 'POST',
        data,
      }),
      transformResponse: (res: ReviewWorkflows.Create.Response) => res.data,
      invalidatesTags: [{ type: 'ReviewWorkflow' as const, id: 'LIST' }],
    }),
    updateWorkflow: builder.mutation<
      ReviewWorkflows.Update.Response['data'],
      ReviewWorkflows.Update.Request['body'] & ReviewWorkflows.Update.Params
    >({
      query: ({ id, ...data }) => ({
        url: `/admin/review-workflows/workflows/${id}`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: ReviewWorkflows.Update.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [{ type: 'ReviewWorkflow' as const, id: arg.id }],
    }),
    deleteWorkflow: builder.mutation<
      ReviewWorkflows.Delete.Response['data'],
      ReviewWorkflows.Delete.Params
    >({
      query: ({ id }) => ({
        url: `/admin/review-workflows/workflows/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (res: ReviewWorkflows.Delete.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [{ type: 'ReviewWorkflow' as const, id: arg.id }],
    }),
    getStages: builder.query<
      {
        stages: NonNullable<Contracts.ReviewWorkflows.GetStages.Response['data']>;
        meta: NonNullable<Contracts.ReviewWorkflows.GetStages.Response['meta']>;
      },
      Contracts.ReviewWorkflows.GetStages.Params & { slug: string }
    >({
      query: ({ model, slug, id }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/stages`,
        method: 'GET',
      }),
      transformResponse: (res: Contracts.ReviewWorkflows.GetStages.Response) => {
        return {
          meta: res.meta ?? { workflowCount: 0 },
          stages: res.data ?? [],
        };
      },
      providesTags: (_res, _err, arg) => {
        return [{ type: 'ReviewWorkflowStage' as const, id: arg.id }];
      },
    }),
    updateStage: builder.mutation<
      Contracts.ReviewWorkflows.UpdateStage.Response['data'],
      Contracts.ReviewWorkflows.UpdateStage.Request['body'] &
        Contracts.ReviewWorkflows.UpdateStage.Params & { slug: string }
    >({
      query: ({ model, slug, id, ...data }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/stage`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: Contracts.ReviewWorkflows.UpdateStage.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [{ type: 'ReviewWorkflowStage' as const, id: arg.id }],
    }),
    updateAssignee: builder.mutation<
      Contracts.ReviewWorkflows.UpdateAssignee.Response['data'],
      Contracts.ReviewWorkflows.UpdateAssignee.Request['body'] &
        Contracts.ReviewWorkflows.UpdateAssignee.Params & { slug: string }
    >({
      query: ({ model, slug, id, ...data }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/assignee`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: Contracts.ReviewWorkflows.UpdateAssignee.Response) => res.data,
    }),
  }),
  overrideExisting: false,
});

type GetWorkflowsParams =
  | ReviewWorkflows.Get.Params
  | (ReviewWorkflows.GetAll.Request['query'] & { id?: never });

const {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useUpdateWorkflowMutation,
  useGetStagesQuery,
  useUpdateStageMutation,
  useUpdateAssigneeMutation,
} = reviewWorkflowsApi;

export {
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useUpdateWorkflowMutation,
  useGetStagesQuery,
  useUpdateStageMutation,
  useUpdateAssigneeMutation,
  type GetWorkflowsParams,
};
