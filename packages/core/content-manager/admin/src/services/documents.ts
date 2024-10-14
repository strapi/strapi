/**
 * Related to fetching the actual content of a collection type or single type.
 */

import { SINGLE_TYPES } from '../constants/collections';

import { contentManagerApi } from './api';

import type {
  Clone,
  Create,
  Delete,
  Find,
  FindOne,
  BulkDelete,
  BulkPublish,
  BulkUnpublish,
  Discard,
  CountDraftRelations,
  CountManyEntriesDraftRelations,
  Publish,
  Unpublish,
  Update,
} from '../../../shared/contracts/collection-types';

const documentApi = contentManagerApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    autoCloneDocument: builder.mutation<Clone.Response, Clone.Params & { query?: string }>({
      query: ({ model, sourceId, query }) => ({
        url: `/content-manager/collection-types/${model}/auto-clone/${sourceId}`,
        method: 'POST',
        config: {
          params: query,
        },
      }),
      invalidatesTags: (_result, error, { model }) => {
        if (error) {
          return [];
        }

        return [{ type: 'Document', id: `${model}_LIST` }];
      },
    }),
    cloneDocument: builder.mutation<
      Clone.Response,
      Clone.Params & {
        data: Clone.Request['body'];
        params?: Clone.Request['query'];
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
      invalidatesTags: (_result, _error, { model }) => [
        { type: 'Document', id: `${model}_LIST` },
        { type: 'UidAvailability', id: model },
      ],
    }),
    /**
     * Creates a new collection-type document. This should ONLY be used for collection-types.
     * single-types should always be using `updateDocument` since they always exist.
     */
    createDocument: builder.mutation<
      Create.Response,
      Create.Params & {
        data: Create.Request['body'];
        params?: Create.Request['query'];
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
      invalidatesTags: (result, _error, { model }) => [
        { type: 'Document', id: `${model}_LIST` },
        'Relations',
        { type: 'UidAvailability', id: model },
      ],
    }),
    deleteDocument: builder.mutation<
      Delete.Response,
      Pick<Delete.Params, 'model'> &
        Pick<Partial<Delete.Params>, 'documentId'> & {
          collectionType: string;
          params?: Find.Request['query'];
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
      BulkDelete.Response,
      BulkDelete.Params & BulkDelete.Request['body'] & { params?: Find.Request['query'] }
    >({
      query: ({ model, params, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkDelete`,
        method: 'POST',
        data: body,
        config: {
          params,
        },
      }),
      invalidatesTags: (_res, _error, { model }) => [{ type: 'Document', id: `${model}_LIST` }],
    }),
    discardDocument: builder.mutation<
      Discard.Response,
      Pick<Discard.Params, 'model'> &
        Partial<Pick<Discard.Params, 'documentId'>> & {
          collectionType: string;
          params?: Find.Request['query'] & {
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
          'Relations',
          { type: 'UidAvailability', id: model },
        ];
      },
    }),
    /**
     * Gets all documents of a collection type or single type.
     * By passing different params you can get different results e.g. only published documents or 'es' documents.
     */
    getAllDocuments: builder.query<
      Find.Response,
      Find.Params & {
        params?: Find.Request['query'] & {
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
          { type: 'Document', id: `ALL_LIST` },
          { type: 'Document', id: `${arg.model}_LIST` },
          ...(result?.results.map(({ documentId }) => ({
            type: 'Document' as const,
            id: `${arg.model}_${documentId}`,
          })) ?? []),
        ];
      },
    }),
    getDraftRelationCount: builder.query<
      CountDraftRelations.Response,
      {
        collectionType: string;
        model: string;
        /**
         * You don't pass the documentId if the document is a single-type
         */
        documentId?: string;
        params?: CountDraftRelations.Request['query'];
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
      FindOne.Response,
      Pick<FindOne.Params, 'model'> &
        Partial<Pick<FindOne.Params, 'documentId'>> & {
          collectionType: string;
          params?: FindOne.Request['query'];
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
          // Make it easy to invalidate all individual documents queries for a model
          {
            type: 'Document',
            id: `${model}_ALL_ITEMS`,
          },
        ];
      },
    }),
    getManyDraftRelationCount: builder.query<
      CountManyEntriesDraftRelations.Response['data'],
      CountManyEntriesDraftRelations.Request['query'] & {
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
      transformResponse: (response: CountManyEntriesDraftRelations.Response) => response.data,
    }),
    /**
     * This endpoint will either create or update documents at the same time as publishing.
     */
    publishDocument: builder.mutation<
      Publish.Response,
      Pick<Publish.Params, 'model'> &
        Partial<Pick<Publish.Params, 'documentId'>> & {
          collectionType: string;
          data: Publish.Request['body'];
          params?: Publish.Request['query'];
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
          'Relations',
        ];
      },
    }),
    publishManyDocuments: builder.mutation<
      BulkPublish.Response,
      BulkPublish.Params & BulkPublish.Request['body'] & { params?: BulkPublish.Request['query'] }
    >({
      query: ({ model, params, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkPublish`,
        method: 'POST',
        data: body,
        config: {
          params,
        },
      }),
      invalidatesTags: (_res, _error, { model, documentIds }) =>
        documentIds.map((id) => ({ type: 'Document', id: `${model}_${id}` })),
    }),
    updateDocument: builder.mutation<
      Update.Response,
      Pick<Update.Params, 'model'> &
        Partial<Pick<Update.Params, 'documentId'>> & {
          collectionType: string;
          data: Update.Request['body'];
          params?: Update.Request['query'];
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
          'Relations',
          { type: 'UidAvailability', id: model },
        ];
      },
      async onQueryStarted({ data, ...patch }, { dispatch, queryFulfilled }) {
        // Optimistically update the cache with the new data
        const patchResult = dispatch(
          documentApi.util.updateQueryData('getDocument', patch, (draft) => {
            Object.assign(draft.data, data);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          // Rollback the optimistic update if there's an error
          patchResult.undo();
        }
      },
    }),
    unpublishDocument: builder.mutation<
      Unpublish.Response,
      Pick<Unpublish.Params, 'model'> &
        Partial<Pick<Unpublish.Params, 'documentId'>> & {
          collectionType: string;
          params?: Unpublish.Request['query'];
          data: Unpublish.Request['body'];
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
      BulkUnpublish.Response,
      Pick<BulkUnpublish.Params, 'model'> &
        BulkUnpublish.Request['body'] & {
          params?: BulkUnpublish.Request['query'];
        }
    >({
      query: ({ model, params, ...body }) => ({
        url: `/content-manager/collection-types/${model}/actions/bulkUnpublish`,
        method: 'POST',
        data: body,
        config: {
          params,
        },
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
