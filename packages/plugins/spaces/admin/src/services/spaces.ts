import { spacesApi } from './api';

export interface SpaceLimits {
  /** `null` = unlimited. */
  maxSpaces: number | null;
  count: number;
  canCreate: boolean;
}

export interface AvailableSpace {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

export interface ManagedSpace extends AvailableSpace {
  status: 'active' | 'archived';
  /** Origin the workspace previews on (live preview); `null` = the handler's default. */
  previewBaseUrl?: string | null;
}

interface CreateSpaceRequest {
  name: string;
  slug?: string;
  color?: string | null;
}

interface UpdateSpaceRequest {
  id: number;
  name?: string;
  slug?: string;
  color?: string | null;
  status?: ManagedSpace['status'];
  previewBaseUrl?: string | null;
}

interface MoveToSpaceRequest {
  uid: string;
  documentIds: string[];
  /** Target workspace slug, or `null` to share the entries with every workspace. */
  targetSpaceSlug: string | null;
}

interface MoveToSpaceResponse {
  movedCount: number;
  targetSpaceId: number | null;
  documentIds: string[];
}

export type EntryAccessReason = 'shared-entry' | 'shared-content-type' | 'other-workspace';

/** A workspace as it travels on an entry — in a list row, or in an entry state. */
export interface EntrySpace {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

/** What `GET /spaces/entry-states` says about one document, for the calling workspace. */
export interface EntryState {
  /** The document's workspace; `null` = shared with every workspace. */
  space: EntrySpace | null;
  editable: boolean;
  reason?: EntryAccessReason;
  /** The workspace could take its own copy of this inherited entry. */
  canOverride?: boolean;
  /** What this workspace reads is its own copy of an inherited entry. */
  isOverride?: boolean;
}

/** Who follows an inherited entry, and who has taken their own copy of it. */
export interface InheritanceSummary {
  inherited: boolean;
  inheritedIn: EntrySpace[];
  overriddenIn: Array<EntrySpace & { edited: boolean }>;
}

export type ReleaseBucketStatus = 'empty' | 'ready' | 'blocked' | 'done';

export interface ReleaseBucket {
  total: number;
  invalid: number;
  status: ReleaseBucketStatus;
}

export interface ReleaseWorkspaceStatusResponse {
  global: string;
  released: boolean;
  byWorkspace: Array<
    ReleaseBucket & { id: number; slug: string; name: string; color: string | null }
  >;
  shared: ReleaseBucket;
}

const endpoints = spacesApi.injectEndpoints({
  endpoints: (builder) => ({
    getMineSpaces: builder.query<AvailableSpace[], { contentType?: string } | void>({
      query: (arg) => {
        const params = arg?.contentType
          ? `?contentType=${encodeURIComponent(arg.contentType)}`
          : '';
        return `/spaces/mine${params}`;
      },
      providesTags: (_res, _err, arg) => [
        { type: 'Space', id: arg?.contentType ? `LIST-${arg.contentType}` : 'LIST' },
      ],
    }),
    getAllSpaces: builder.query<ManagedSpace[], void>({
      query: () => '/spaces/all',
      providesTags: [{ type: 'Space', id: 'ALL' }],
    }),
    updateSpace: builder.mutation<ManagedSpace, UpdateSpaceRequest>({
      query: ({ id, ...body }) => ({
        url: `/spaces/${id}`,
        method: 'PUT',
        data: body,
      }),
      // Whole-type invalidation: the switcher list, the settings list and any
      // per-content-type eligibility lists all reflect renames/archives.
      invalidatesTags: ['Space'],
    }),
    deleteSpace: builder.mutation<{ id: number; slug: string }, number>({
      query: (id) => ({
        url: `/spaces/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Space'],
    }),
    createSpace: builder.mutation<AvailableSpace, CreateSpaceRequest>({
      query: (body) => ({
        url: '/spaces',
        method: 'POST',
        data: body,
      }),
      // Invalidate every Space tag (plain type entry) so the switcher and any
      // per-content-type eligibility lists refetch with the new space.
      invalidatesTags: ['Space'],
    }),
    moveToSpace: builder.mutation<MoveToSpaceResponse, MoveToSpaceRequest>({
      query: (body) => ({
        url: '/spaces/move',
        method: 'POST',
        data: body,
      }),
      // No Space-tag invalidation: moving entries never changes the space list.
      // The caches that DO go stale (the CM's document/list caches) are
      // invalidated by MoveToSpaceActions with targeted Document tags; the
      // per-entry states live outside RTK (see utils/entryStates.ts) and are
      // dropped with `clearEntryStateCache()` by the same callers.
    }),
    overrideEntry: builder.mutation<
      { documentId: string; spaceId: number },
      { uid: string; documentId: string }
    >({
      query: (body) => ({ url: '/spaces/inheritance/override', method: 'POST', data: body }),
    }),
    resetOverride: builder.mutation<
      { documentId: string; spaceId: number },
      { uid: string; documentId: string }
    >({
      query: (body) => ({ url: '/spaces/inheritance/reset', method: 'POST', data: body }),
    }),
    getInheritance: builder.query<
      Record<string, InheritanceSummary>,
      { uid: string; documentIds: string[] }
    >({
      query: ({ uid, documentIds }) =>
        `/spaces/inheritance?contentType=${encodeURIComponent(uid)}&documentIds=${documentIds
          .map(encodeURIComponent)
          .join(',')}`,
      transformResponse: (response: { data: Record<string, InheritanceSummary> }) =>
        response?.data ?? {},
    }),
    getSpaceLimits: builder.query<SpaceLimits, void>({
      query: () => '/spaces/limits',
      providesTags: [{ type: 'Space', id: 'LIMITS' }],
    }),
    /**
     * "Where did this admin leave off?" is a question about the session that
     * just started, and the admin is one page load from login to logout to the
     * next login. Cached for even a moment past the switcher's interest in it,
     * the answer given to whoever signed in before is handed to the next admin
     * with no request on the wire — so this entry is dropped the instant its
     * last subscriber goes away, and the next hydration has to ask again.
     */
    getCurrentSpace: builder.query<{ slug: string | null }, void>({
      query: () => '/spaces/mine/current',
      keepUnusedDataFor: 0,
    }),
    setCurrentSpace: builder.mutation<{ slug: string }, { slug: string }>({
      query: (body) => ({ url: '/spaces/mine/current', method: 'PUT', data: body }),
    }),
    getReleaseStatus: builder.query<ReleaseWorkspaceStatusResponse, { id: string }>({
      query: ({ id }) => `/spaces/releases/${id}/status`,
      providesTags: (_res, _err, { id }) => [
        { type: 'ReleaseAction', id: 'LIST' },
        { type: 'ReleaseAction', id },
      ],
    }),
  }),
});

export const {
  useGetMineSpacesQuery,
  useGetAllSpacesQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useDeleteSpaceMutation,
  useMoveToSpaceMutation,
  useGetCurrentSpaceQuery,
  useSetCurrentSpaceMutation,
  useGetReleaseStatusQuery,
  useGetSpaceLimitsQuery,
  useOverrideEntryMutation,
  useResetOverrideMutation,
  useGetInheritanceQuery,
} = endpoints;
