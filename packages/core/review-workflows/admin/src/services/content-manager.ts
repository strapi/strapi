/* eslint-disable check-file/filename-naming-convention */
import { reviewWorkflowsApi } from './api';

import type {
  GetStages,
  UpdateStage,
  UpdateAssignee,
} from '../../../shared/contracts/review-workflows';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const contentManagerApi = reviewWorkflowsApi.injectEndpoints({
  endpoints: (builder) => ({
    getStages: builder.query<
      {
        stages: NonNullable<GetStages.Response['data']>;
        meta: NonNullable<GetStages.Response['meta']>;
      },
      GetStages.Params & { slug: string }
    >({
      query: ({ model, slug, id }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/stages`,
        method: 'GET',
      }),
      transformResponse: (res: GetStages.Response) => {
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
      UpdateStage.Response['data'],
      UpdateStage.Request['body'] & UpdateStage.Params & { slug: string }
    >({
      query: ({ model, slug, id, ...data }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/stage`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: UpdateStage.Response) => res.data,
      invalidatesTags: (res, _err, arg) => [{ type: 'ReviewWorkflowStage' as const, id: arg.id }],
    }),
    updateAssignee: builder.mutation<
      UpdateAssignee.Response['data'],
      UpdateAssignee.Request['body'] & UpdateAssignee.Params & { slug: string }
    >({
      query: ({ model, slug, id, ...data }) => ({
        url: `/admin/content-manager/${slug}/${model}/${id}/assignee`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: UpdateAssignee.Response) => res.data,
    }),
    getContentTypes: builder.query<Contracts.ContentTypes.ContentType[], void>({
      query: () => ({
        url: `/content-manager/content-types`,
        method: 'GET',
      }),
      transformResponse: (res: { data: Contracts.ContentTypes.ContentType[] }) => res.data,
    }),
  }),
});

const {
  useGetStagesQuery,
  useUpdateStageMutation,
  useUpdateAssigneeMutation,
  useGetContentTypesQuery,
} = contentManagerApi;

export {
  useGetStagesQuery,
  useUpdateStageMutation,
  useUpdateAssigneeMutation,
  useGetContentTypesQuery,
};
