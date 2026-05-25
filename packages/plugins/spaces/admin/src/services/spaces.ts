import { spacesApi } from './api';

export interface AvailableSpace {
  id: number;
  slug: string;
  name: string;
  color: string | null;
}

interface MoveToSpaceRequest {
  uid: string;
  documentIds: string[];
  targetSpaceSlug: string;
}

interface MoveToSpaceResponse {
  movedCount: number;
  targetSpaceId: number;
  documentIds: string[];
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
    moveToSpace: builder.mutation<MoveToSpaceResponse, MoveToSpaceRequest>({
      query: (body) => ({
        url: '/spaces/move',
        method: 'POST',
        data: body,
      }),
      // The move changes which space a row belongs to; any caches keyed on that row's
      // listing will be invalidated when the page reloads anyway. We invalidate the
      // generic Space tag so any UI showing space-membership refreshes.
      invalidatesTags: [{ type: 'Space', id: 'LIST' }],
    }),
  }),
});

export const { useGetMineSpacesQuery, useMoveToSpaceMutation } = endpoints;
