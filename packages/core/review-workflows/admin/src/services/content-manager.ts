/* eslint-disable check-file/filename-naming-convention */
import { reviewWorkflowsApi } from './api';

import type {
  GetStages,
  UpdateStage,
  UpdateAssignee,
} from '../../../shared/contracts/review-workflows';
import type { Contracts } from '@strapi/content-manager/_internal/shared';

type ContentType = Contracts.ContentTypes.ContentType;
interface ContentTypes {
  collectionType: ContentType[];
  singleType: ContentType[];
}

const SINGLE_TYPES = 'single-types';

const contentManagerApi = reviewWorkflowsApi.injectEndpoints({
  endpoints: (builder) => ({
    getStages: builder.query<
      {
        stages: NonNullable<GetStages.Response['data']>;
        meta: NonNullable<GetStages.Response['meta']>;
      },
      GetStages.Params & { slug: string; params?: object }
    >({
      query: ({ model, slug, id, params }) => ({
        url: `/review-workflows/content-manager/${slug}/${model}/${id}/stages`,
        method: 'GET',
        config: {
          params,
        },
      }),
      transformResponse: (res: GetStages.Response) => {
        return {
          meta: res.meta ?? { workflowCount: 0 },
          stages: res.data ?? [],
        };
      },
      providesTags: ['ReviewWorkflowStages'],
    }),
    updateStage: builder.mutation<
      UpdateStage.Response['data'],
      UpdateStage.Request['body'] & UpdateStage.Params & { slug: string; params?: object }
    >({
      query: ({ model, slug, id, params, ...data }) => ({
        url: `/review-workflows/content-manager/${slug}/${model}/${id}/stage`,
        method: 'PUT',
        data,
        config: {
          params,
        },
      }),
      transformResponse: (res: UpdateStage.Response) => res.data,
      invalidatesTags: (_result, _error, { slug, id, model }) => {
        return [
          {
            type: 'Document',
            id: slug !== SINGLE_TYPES ? `${model}_${id}` : model,
          },
          { type: 'Document', id: `${model}_LIST` },
          'ReviewWorkflowStages',
        ];
      },
    }),
    updateAssignee: builder.mutation<
      UpdateAssignee.Response['data'],
      UpdateAssignee.Request['body'] & UpdateAssignee.Params & { slug: string; params?: object }
    >({
      query: ({ model, slug, id, params, ...data }) => ({
        url: `/review-workflows/content-manager/${slug}/${model}/${id}/assignee`,
        method: 'PUT',
        data,
        config: {
          params,
        },
      }),
      transformResponse: (res: UpdateAssignee.Response) => res.data,
      invalidatesTags: (_result, _error, { slug, id, model }) => {
        return [
          {
            type: 'Document',
            id: slug !== SINGLE_TYPES ? `${model}_${id}` : model,
          },
          { type: 'Document', id: `${model}_LIST` },
        ];
      },
    }),
    getContentTypes: builder.query<ContentTypes, void>({
      query: () => ({
        url: `/content-manager/content-types`,
        method: 'GET',
      }),
      transformResponse: (res: { data: Contracts.ContentTypes.ContentType[] }) => {
        return res.data.reduce<ContentTypes>(
          (acc, curr) => {
            if (curr.isDisplayed) {
              acc[curr.kind].push(curr);
            }
            return acc;
          },
          {
            collectionType: [],
            singleType: [],
          }
        );
      },
    }),
  }),
  overrideExisting: true,
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
export type { ContentTypes, ContentType };
