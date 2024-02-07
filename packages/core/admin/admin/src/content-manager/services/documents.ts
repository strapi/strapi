/**
 * Related to fetching the actual content of a collection type or single type.
 */

import { contentManagerApi } from './api';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const documentApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    autoCloneDocument: builder.mutation<
      Contracts.CollectionTypes.Clone.Response,
      Contracts.CollectionTypes.Clone.Params & { query?: string }
    >({
      query: ({ model, sourceId: id, query }) => ({
        url: `/content-manager/collection-types/${model}/auto-clone/${id}`,
        method: 'POST',
        config: {
          params: query,
        },
      }),
      invalidatesTags: (_result, _error, { model }) => [{ type: 'Document', id: `${model}_LIST` }],
    }),
    cloneDocument: builder.mutation<
      Contracts.CollectionTypes.Clone.Response,
      Contracts.CollectionTypes.Clone.Params & {
        data: Contracts.CollectionTypes.Clone.Request['body'];
        params?: Contracts.CollectionTypes.Clone.Request['query'];
      }
    >({
      query: ({ model, sourceId: id, data, params }) => ({
        url: `/content-manager/collection-types/${model}/clone/${id}`,
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { model }) => [{ type: 'Document', id: `${model}_LIST` }],
    }),
    /**
     * Creates a new collection-type document. This should ONLY be used for collection-types.
     * single-types should always be using `updateDocument` since they always exist.
     */
    createDocument: builder.mutation<
      Contracts.CollectionTypes.Create.Response,
      Contracts.CollectionTypes.Create.Params & {
        data: Contracts.CollectionTypes.Create.Request['body'];
        params?: Contracts.CollectionTypes.Create.Request['query'];
      }
    >({
      query: ({ model, data, params }) => ({
        url: `/content-manager/collection-types/${model}`,
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { model }) => [{ type: 'Document', id: `${model}_LIST` }],
    }),
    deleteDocument: builder.mutation<
      Contracts.CollectionTypes.Delete.Response,
      Contracts.CollectionTypes.Delete.Params & {
        collectionType: string;
        params?: Contracts.CollectionTypes.Delete.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, params }) => ({
        url: `/content-manager/${collectionType}/${model}/${id}`,
        method: 'DELETE',
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { model }) => [{ type: 'Document', id: `${model}_LIST` }],
    }),
    deleteManyDocuments: builder.mutation<
      Contracts.CollectionTypes.BulkDelete.Response,
      Contracts.CollectionTypes.BulkDelete.Params &
        Contracts.CollectionTypes.BulkDelete.Request['body']
    >({
      query: ({ model, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkDelete`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _error, { model, ids }) =>
        ids.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
    /**
     * Gets all documents of a collection type or single type.
     * By passing different params you can get different results e.g. only published documents or 'es' documents.
     */
    getAllDocuments: builder.query<
      Contracts.CollectionTypes.Find.Response,
      Contracts.CollectionTypes.Find.Params & {
        params?: Contracts.CollectionTypes.Find.Request['query'] & {
          [key: string]: any;
        };
      }
    >({
      query: ({ model, params }) => ({
        url: `/content-manager/collection-types/${model}`,
        method: 'GET',
        config: {
          params,
        },
      }),
      providesTags: (result, _error, arg) => {
        return [
          { type: 'Document', id: `${arg.model}_LIST` },
          ...(result?.results.map(({ id }) => ({
            type: 'Document' as const,
            id: `${arg.model}_${id}`,
          })) ?? []),
        ];
      },
    }),
    getDraftRelationCount: builder.query<
      Contracts.CollectionTypes.CountDraftRelations.Response,
      {
        collectionType: string;
        model: string;
        /**
         * You don't pass the ID if the document is a single-type
         */
        id?: string;
        params?: Contracts.CollectionTypes.CountDraftRelations.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, params }) => ({
        url: id
          ? `/content-manager/${collectionType}/${model}/${id}/actions/countDraftRelations`
          : `/content-manager/${collectionType}/${model}/actions/countDraftRelations`,
        method: 'GET',
        config: {
          params,
        },
      }),
    }),
    getDocument: builder.query<
      Contracts.CollectionTypes.FindOne.Response,
      {
        collectionType: string;
        model: string;
        id?: string;
        params?: Contracts.CollectionTypes.FindOne.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, params }) => ({
        url: `/content-manager/${collectionType}/${model}${id ? `/${id}` : ''}`,
        method: 'GET',
        config: {
          params,
        },
      }),
      providesTags: (result, _error, { model, id }) => [
        // we prefer the result's id because we don't fetch single-types with an ID.
        { type: 'Document', id: `${model}_${result && 'id' in result ? result.id : id}` },
      ],
    }),
    getManyDraftRelationCount: builder.query<
      Contracts.CollectionTypes.CountManyEntriesDraftRelations.Response['data'],
      Contracts.CollectionTypes.CountManyEntriesDraftRelations.Request['query'] & {
        model: string;
      }
    >({
      query: ({ model, ...params }) => ({
        url: `/content-manager/collection-types/${model}/actions/countManyEntriesDraftRelations`,
        method: 'GET',
        config: {
          params,
        },
      }),
      transformResponse: (
        response: Contracts.CollectionTypes.CountManyEntriesDraftRelations.Response
      ) => response.data,
    }),
    publishDocument: builder.mutation<
      Contracts.CollectionTypes.Publish.Response,
      {
        collectionType: string;
        model: string;
        /**
         * You don't pass the ID if the document is a single-type
         */
        id?: string;
        params?: Contracts.CollectionTypes.Publish.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, params }) => ({
        url: id
          ? `/content-manager/${collectionType}/${model}/${id}/actions/publish`
          : `/content-manager/${collectionType}/${model}/actions/publish`,
        method: 'POST',
        config: {
          params,
        },
      }),
      invalidatesTags: (result, _error, { model, id }) => {
        return [
          {
            type: 'Document',
            id: result && 'id' in result ? `${model}_${result.id}` : `${model}_${id}`,
          },
        ];
      },
    }),
    publishManyDocuments: builder.mutation<
      Contracts.CollectionTypes.BulkPublish.Response,
      Contracts.CollectionTypes.BulkPublish.Params &
        Contracts.CollectionTypes.BulkPublish.Request['body']
    >({
      query: ({ model, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkPublish`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _error, { model, ids }) =>
        ids.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
    updateDocument: builder.mutation<
      Contracts.CollectionTypes.Update.Response,
      {
        collectionType: string;
        model: string;
        id?: string;
        data: Contracts.CollectionTypes.Update.Request['body'];
        params?: Contracts.CollectionTypes.Update.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, data, params }) => ({
        url: `/content-manager/${collectionType}/${model}${id ? `/${id}` : ''}`,
        method: 'PUT',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { model, id }) => [
        { type: 'Document', id: `${model}_${id}` },
      ],
    }),
    unpublishDocument: builder.mutation<
      Contracts.CollectionTypes.Unpublish.Response,
      {
        collectionType: string;
        model: string;
        /**
         * You don't pass the ID if the document is a single-type
         */
        id?: string;
        params?: Contracts.CollectionTypes.Unpublish.Request['query'];
      }
    >({
      query: ({ collectionType, model, id, params }) => ({
        url: id
          ? `/content-manager/${collectionType}/${model}/${id}/actions/unpublish`
          : `/content-manager/${collectionType}/${model}/actions/unpublish`,
        method: 'POST',
        config: {
          params,
        },
      }),
      invalidatesTags: (result, _error, { model, id }) => {
        return [
          {
            type: 'Document',
            id: result && 'id' in result ? `${model}_${result.id}` : `${model}_${id}`,
          },
        ];
      },
    }),
    unpublishManyDocuments: builder.mutation<
      Contracts.CollectionTypes.BulkUnpublish.Response,
      Contracts.CollectionTypes.BulkUnpublish.Params &
        Contracts.CollectionTypes.BulkUnpublish.Request['body']
    >({
      query: ({ model, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkUnpublish`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _error, { model, ids }) =>
        ids.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
  }),
});

const {
  useAutoCloneDocumentMutation,
  useCloneDocumentMutation,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useDeleteManyDocumentsMutation,
  useGetAllDocumentsQuery,
  useLazyGetDocumentQuery,
  useGetDocumentQuery,
  useLazyGetDraftRelationCountQuery,
  useGetManyDraftRelationCountQuery,
  usePublishDocumentMutation,
  usePublishManyDocumentsMutation,
  useUpdateDocumentMutation,
  useUnpublishDocumentMutation,
  useUnpublishManyDocumentsMutation,
} = documentApi;

export {
  useAutoCloneDocumentMutation,
  useCloneDocumentMutation,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useDeleteManyDocumentsMutation,
  useGetAllDocumentsQuery,
  useLazyGetDocumentQuery,
  useGetDocumentQuery,
  useLazyGetDraftRelationCountQuery as useGetDraftRelationCountQuery,
  useGetManyDraftRelationCountQuery,
  usePublishDocumentMutation,
  usePublishManyDocumentsMutation,
  useUpdateDocumentMutation,
  useUnpublishDocumentMutation,
  useUnpublishManyDocumentsMutation,
};
