import { adminApi } from '@strapi/admin/strapi-admin';

const branchesApi = adminApi.enhanceEndpoints({
  addTagTypes: ['Branch', 'BranchChanges', 'BranchStates', 'Document'],
});

export type BranchStatus = 'active' | 'merged' | 'archived';

export interface Branch {
  id: number | null;
  slug: string;
  name: string;
  description?: string | null;
  color: string | null;
  status: BranchStatus;
  parent: { id: number; slug?: string; name?: string } | null;
  mergedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  changesCount?: number;
}

export interface ChangeSummary {
  contentType: string;
  documentId: string;
  locale: string | null;
  kind: 'create' | 'update' | 'delete';
  title: string | null;
  attributes: string[];
  conflicts: string[];
  updatedAt: string | null;
  updatedBy: { id: number; firstname?: string; lastname?: string; email?: string } | null;
}

export interface BranchChanges {
  changes: ChangeSummary[];
  counts: { create: number; update: number; delete: number; conflicts: number };
}

export interface AttributeDiff {
  attribute: string;
  type: string;
  base: unknown;
  parent: unknown;
  branch: unknown;
  status: 'clean' | 'conflict' | 'same';
}

export interface DocumentDiff {
  contentType: string;
  documentId: string;
  locale: string | null;
  title: string | null;
  attributes: AttributeDiff[];
}

export type DocumentBranchState = 'inherited' | 'modified' | 'created' | 'deleted';

export interface DocumentState {
  state: DocumentBranchState;
  attributes: string[];
  branches: Array<{ id: number; slug: string; name: string; color: string | null }>;
}

export type MergeResolutions = Record<
  string,
  Record<string, Record<string, Record<string, 'branch' | 'parent'>>>
>;

export interface MergeSummary {
  branch: { id: number; slug: string; name: string };
  parent: { id: number; slug: string } | null;
  created: number;
  updated: number;
  deleted: number;
  skipped: Array<{
    contentType: string;
    documentId: string;
    locale: string | null;
    reason: string;
  }>;
}

const endpoints = branchesApi.injectEndpoints({
  endpoints: (builder) => ({
    getMineBranches: builder.query<Branch[], void>({
      query: () => '/branches/mine',
      providesTags: [{ type: 'Branch', id: 'MINE' }],
    }),
    getAllBranches: builder.query<Branch[], void>({
      query: () => '/branches',
      providesTags: [{ type: 'Branch', id: 'ALL' }],
    }),
    getBranch: builder.query<Branch, number>({
      query: (id) => `/branches/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Branch', id }],
    }),
    createBranch: builder.mutation<
      Branch,
      {
        name: string;
        slug?: string;
        parentId?: number | null;
        description?: string;
        color?: string | null;
      }
    >({
      query: (body) => ({ url: '/branches', method: 'POST', data: body }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: builder.mutation<
      Branch,
      {
        id: number;
        name?: string;
        description?: string | null;
        color?: string | null;
        status?: 'active' | 'archived';
      }
    >({
      query: ({ id, ...body }) => ({ url: `/branches/${id}`, method: 'PUT', data: body }),
      invalidatesTags: ['Branch'],
    }),
    deleteBranch: builder.mutation<{ id: number; slug: string }, number>({
      query: (id) => ({ url: `/branches/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Branch', 'BranchStates'],
    }),
    getBranchChanges: builder.query<BranchChanges, number>({
      query: (id) => `/branches/${id}/changes`,
      providesTags: (_res, _err, id) => [{ type: 'BranchChanges', id }],
    }),
    getDocumentDiff: builder.query<
      DocumentDiff,
      { id: number; contentType: string; documentId: string; locale?: string | null }
    >({
      query: ({ id, contentType, documentId, locale }) => ({
        url: `/branches/${id}/changes/${contentType}/${documentId}`,
        method: 'GET',
        config: { params: locale ? { locale } : {} },
      }),
      providesTags: (_res, _err, { id, contentType, documentId }) => [
        { type: 'BranchChanges', id: `${id}_${contentType}_${documentId}` },
        { type: 'BranchChanges', id },
      ],
    }),
    discardDocumentChanges: builder.mutation<
      { discardedChanges: number; deletedDocuments: number },
      { id: number; contentType: string; documentId: string; locale?: string | null }
    >({
      query: ({ id, contentType, documentId, locale }) => ({
        url: `/branches/${id}/changes/${contentType}/${documentId}`,
        method: 'DELETE',
        config: { params: locale ? { locale } : {} },
      }),
      invalidatesTags: (_res, _err, { contentType, documentId }) => [
        'BranchChanges',
        'BranchStates',
        'Branch',
        { type: 'Document', id: `${contentType}_${documentId}` },
        { type: 'Document', id: `${contentType}_LIST` },
      ],
    }),
    mergeBranch: builder.mutation<MergeSummary, { id: number; resolutions?: MergeResolutions }>({
      query: ({ id, resolutions }) => ({
        url: `/branches/${id}/merge`,
        method: 'POST',
        data: { resolutions: resolutions ?? {} },
      }),
      invalidatesTags: ['Branch', 'BranchChanges', 'BranchStates', 'Document'],
    }),
    getBranchStates: builder.query<
      Record<string, DocumentState>,
      { contentType: string; documentIds: string[] }
    >({
      query: ({ contentType, documentIds }) => ({
        url: '/branches/states',
        method: 'GET',
        config: { params: { contentType, documentIds: documentIds.join(',') } },
      }),
      providesTags: (_res, _err, { contentType }) => [
        { type: 'BranchStates', id: contentType },
        'BranchStates',
      ],
    }),
  }),
});

export const {
  useGetMineBranchesQuery,
  useGetAllBranchesQuery,
  useGetBranchQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useGetBranchChangesQuery,
  useGetDocumentDiffQuery,
  useDiscardDocumentChangesMutation,
  useMergeBranchMutation,
  useGetBranchStatesQuery,
} = endpoints;

export { branchesApi };
