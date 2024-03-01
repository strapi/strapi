/**
 * Related to fetching the actual content of a collection type or single type.
 */

import { SINGLE_TYPES } from '../constants/collections';

import { contentManagerApi } from './api';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

const documentApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    autoCloneDocument: builder.mutation<
      Contracts.CollectionTypes.Clone.Response,
      Contracts.CollectionTypes.Clone.Params & { query?: string }
    >({
      query: ({ model, sourceId, query }) => ({
        url: `/content-manager/collection-types/${model}/auto-clone/${sourceId}`,
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
      query: ({ model, sourceId, data, params }) => ({
        url: `/content-manager/collection-types/${model}/clone/${sourceId}`,
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
      Pick<Contracts.CollectionTypes.Delete.Params, 'model'> &
        Pick<Partial<Contracts.CollectionTypes.Delete.Params>, 'documentId'> & {
          collectionType: string;
          params?: Contracts.CollectionTypes.Find.Request['query'];
        }
    >({
      query: ({ collectionType, model, documentId, params }) => ({
        url: `/content-manager/${collectionType}/${model}${
          collectionType !== SINGLE_TYPES && documentId ? `/${documentId}` : ''
        }`,
        method: 'DELETE',
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { collectionType, model }) => [
        { type: 'Document', id: collectionType !== SINGLE_TYPES ? `${model}_LIST` : model },
      ],
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
      invalidatesTags: (_res, _error, { model, documentIds }) =>
        documentIds.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
    discardDocument: builder.mutation<
      Contracts.CollectionTypes.Discard.Response,
      Pick<Contracts.CollectionTypes.Discard.Params, 'model'> &
        Partial<Pick<Contracts.CollectionTypes.Discard.Params, 'documentId'>> & {
          collectionType: string;
          params?: Contracts.CollectionTypes.Find.Request['query'] & {
            [key: string]: any;
          };
        }
    >({
      query: ({ collectionType, model, documentId, params }) => ({
        url: documentId
          ? `/content-manager/${collectionType}/${model}/${documentId}/actions/discard`
          : `/content-manager/${collectionType}/${model}/actions/discard`,
        method: 'POST',
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { collectionType, model, documentId }) => {
        return [
          {
            type: 'Document',
            id: collectionType !== SINGLE_TYPES ? `${model}_${documentId}` : model,
          },
          { type: 'Document', id: `${model}_LIST` },
        ];
      },
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
          ...(result?.results.map(({ documentId }) => ({
            type: 'Document' as const,
            id: `${arg.model}_${documentId}`,
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
         * You don't pass the documentId if the document is a single-type
         */
        documentId?: string;
        params?: Contracts.CollectionTypes.CountDraftRelations.Request['query'];
      }
    >({
      query: ({ collectionType, model, documentId, params }) => ({
        url: documentId
          ? `/content-manager/${collectionType}/${model}/${documentId}/actions/countDraftRelations`
          : `/content-manager/${collectionType}/${model}/actions/countDraftRelations`,
        method: 'GET',
        config: {
          params,
        },
      }),
    }),
    getDocument: builder.query<
      Contracts.CollectionTypes.FindOne.Response,
      Pick<Contracts.CollectionTypes.FindOne.Params, 'model'> &
        Partial<Pick<Contracts.CollectionTypes.FindOne.Params, 'documentId'>> & {
          collectionType: string;
          params?: Contracts.CollectionTypes.FindOne.Request['query'];
        }
    >({
      // @ts-expect-error – TODO: fix ts error where data unknown doesn't work with response via an assertion?
      queryFn: async (
        { collectionType, model, documentId, params },
        _api,
        _extraOpts,
        baseQuery
      ) => {
        const res = await baseQuery({
          url: `/content-manager/${collectionType}/${model}${documentId ? `/${documentId}` : ''}`,
          method: 'GET',
          config: {
            params,
          },
        });

        /**
         * To stop the query from locking itself in multiple retries, we intercept the error here and manage correctly.
         * This is because single-types don't have a list view and fetching them with the route `/single-types/:model`
         * never returns a list, just a single document but this won't exist if you've not made one before.
         */
        if (res.error && res.error.name === 'NotFoundError' && collectionType === SINGLE_TYPES) {
          return { data: { document: undefined }, error: undefined };
        }

        return res;
      },
      providesTags: (result, _error, { collectionType, model, documentId }) => {
        return [
          // we prefer the result's id because we don't fetch single-types with an ID.
          {
            type: 'Document',
            id:
              collectionType !== SINGLE_TYPES
                ? `${model}_${result && 'documentId' in result ? result.documentId : documentId}`
                : model,
          },
        ];
      },
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
    /**
     * This endpoint will either create or update documents at the same time as publishing.
     */
    publishDocument: builder.mutation<
      Contracts.CollectionTypes.Publish.Response,
      Pick<Contracts.CollectionTypes.Publish.Params, 'model'> &
        Partial<Pick<Contracts.CollectionTypes.Publish.Params, 'documentId'>> & {
          collectionType: string;
          data: Contracts.CollectionTypes.Publish.Request['body'];
          params?: Contracts.CollectionTypes.Publish.Request['query'];
        }
    >({
      query: ({ collectionType, model, documentId, params, data }) => ({
        url: documentId
          ? `/content-manager/${collectionType}/${model}/${documentId}/actions/publish`
          : `/content-manager/${collectionType}/${model}/actions/publish`,
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { collectionType, model, documentId }) => {
        return [
          {
            type: 'Document',
            id: collectionType !== SINGLE_TYPES ? `${model}_${documentId}` : model,
          },
          { type: 'Document', id: `${model}_LIST` },
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
      invalidatesTags: (_res, _error, { model, documentIds }) =>
        documentIds.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
    updateDocument: builder.mutation<
      Contracts.CollectionTypes.Update.Response,
      Pick<Contracts.CollectionTypes.Update.Params, 'model'> &
        Partial<Pick<Contracts.CollectionTypes.Update.Params, 'documentId'>> & {
          collectionType: string;
          data: Contracts.CollectionTypes.Update.Request['body'];
          params?: Contracts.CollectionTypes.Update.Request['query'];
        }
    >({
      query: ({ collectionType, model, documentId, data, params }) => ({
        url: `/content-manager/${collectionType}/${model}${documentId ? `/${documentId}` : ''}`,
        method: 'PUT',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { collectionType, model, documentId }) => {
        return [
          {
            type: 'Document',
            id: collectionType !== SINGLE_TYPES ? `${model}_${documentId}` : model,
          },
        ];
      },
    }),
    unpublishDocument: builder.mutation<
      Contracts.CollectionTypes.Unpublish.Response,
      Pick<Contracts.CollectionTypes.Unpublish.Params, 'model'> &
        Partial<Pick<Contracts.CollectionTypes.Unpublish.Params, 'documentId'>> & {
          collectionType: string;
          params?: Contracts.CollectionTypes.Unpublish.Request['query'];
          data: Contracts.CollectionTypes.Unpublish.Request['body'];
        }
    >({
      query: ({ collectionType, model, documentId, params, data }) => ({
        url: documentId
          ? `/content-manager/${collectionType}/${model}/${documentId}/actions/unpublish`
          : `/content-manager/${collectionType}/${model}/actions/unpublish`,
        method: 'POST',
        data,
        config: {
          params,
        },
      }),
      invalidatesTags: (_result, _error, { collectionType, model, documentId }) => {
        return [
          {
            type: 'Document',
            id: collectionType !== SINGLE_TYPES ? `${model}_${documentId}` : model,
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
      invalidatesTags: (_res, _error, { model, documentIds }) =>
        documentIds.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
  }),
});

const {
  useAutoCloneDocumentMutation,
  useCloneDocumentMutation,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useDeleteManyDocumentsMutation,
  useDiscardDocumentMutation,
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
  useDiscardDocumentMutation,
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
