import { endUsersApi } from './api';

import type {
  BuilderCondition,
  BuilderLayout,
  ConditionListItem,
  ConditionPreviewRequest,
  ConditionPreviewResponse,
  ConditionWriteResponse,
  ConditionsStatus,
} from '../../../shared/contracts/conditions';

/** The admin routes answer `{ data }`. */
type Answer<T> = { data: T };

/** The sample end user a preview is run for: the Content Manager lists them */
interface SampleUser {
  documentId: string;
  email?: string;
}

/**
 * The conditions a role can use, wherever they come from, and the builder's own routes. The
 * endpoints are named for end users: `endUsersApi` is the admin's own `adminApi`, and its endpoint
 * names share one namespace.
 *
 * A write invalidates nothing: the server restarts after it, and the page asks for the list and
 * the layout again only once the restart watcher says the server is back.
 */
const conditionsApi = endUsersApi.injectEndpoints({
  endpoints: (builder) => ({
    getEndUsersConditions: builder.query<ConditionListItem[], void>({
      query: () => '/end-users/conditions',
      transformResponse: (response: Answer<ConditionListItem[]>) => response.data,
      providesTags: (conditions) => [
        { type: 'EndUsersCondition', id: 'LIST' },
        ...(conditions ?? []).map((condition) => ({
          type: 'EndUsersCondition' as const,
          id: condition.name,
        })),
      ],
    }),
    /** Whether a builder write waits for its restart: true from the write until the new process answers */
    getEndUsersConditionsStatus: builder.query<ConditionsStatus, void>({
      query: () => '/end-users/conditions/status',
      transformResponse: (response: Answer<ConditionsStatus>) => response.data,
      keepUnusedDataFor: 0,
    }),
    /** The fields the builder offers: every content type's, the end user's and the profile's, and the role names */
    getEndUsersBuilderLayout: builder.query<BuilderLayout, void>({
      query: () => '/end-users/conditions/builder-layout',
      transformResponse: (response: Answer<BuilderLayout>) => response.data,
      providesTags: [{ type: 'EndUsersLayout', id: 'LAYOUT' }],
    }),
    /** Answers the condition and, when the file no longer declares an input a role bound, `warnings` */
    createEndUsersCondition: builder.mutation<ConditionWriteResponse, BuilderCondition>({
      query: (condition) => ({
        url: '/end-users/conditions',
        method: 'POST',
        data: condition,
      }),
    }),
    /** The slug is the URL's: the body's must be the same one */
    updateEndUsersCondition: builder.mutation<ConditionWriteResponse, BuilderCondition>({
      query: (condition) => ({
        url: `/end-users/conditions/${condition.slug}`,
        method: 'PUT',
        data: condition,
      }),
    }),
    /** Refused while a role uses the condition */
    deleteEndUsersCondition: builder.mutation<{ name: string }, string>({
      query: (slug) => ({
        url: `/end-users/conditions/${slug}`,
        method: 'DELETE',
      }),
      transformResponse: (response: Answer<{ name: string }>) => response.data,
    }),
    /** How many entries of a content type the condition keeps for a sample user, out of how many there are */
    previewEndUsersCondition: builder.mutation<ConditionPreviewResponse, ConditionPreviewRequest>({
      query: (request) => ({
        url: '/end-users/conditions/preview',
        method: 'POST',
        data: request,
      }),
      transformResponse: (response: Answer<ConditionPreviewResponse>) => response.data,
    }),
    /**
     * The end user with this email, through the Content Manager's list, so that the admin finds
     * only whom they may read. The email is encoded here: the fetch client leaves query objects as
     * they are.
     */
    findEndUsersByEmail: builder.query<SampleUser[], string>({
      query: (email) => ({
        url: '/content-manager/collection-types/plugin::end-users.user',
        method: 'GET',
        config: {
          params: `page=1&pageSize=1&filters[$and][0][email][$eqi]=${encodeURIComponent(email)}`,
        },
      }),
      transformResponse: (response: { results?: SampleUser[] }) => response.results ?? [],
      keepUnusedDataFor: 0,
    }),
  }),
});

const {
  useGetEndUsersConditionsQuery: useGetConditionsQuery,
  useGetEndUsersConditionsStatusQuery: useGetConditionsStatusQuery,
  useLazyGetEndUsersConditionsQuery: useLazyGetConditionsQuery,
  useGetEndUsersBuilderLayoutQuery: useGetBuilderLayoutQuery,
  useCreateEndUsersConditionMutation: useCreateConditionMutation,
  useUpdateEndUsersConditionMutation: useUpdateConditionMutation,
  useDeleteEndUsersConditionMutation: useDeleteConditionMutation,
  usePreviewEndUsersConditionMutation: usePreviewConditionMutation,
  useLazyFindEndUsersByEmailQuery,
} = conditionsApi;

export {
  useCreateConditionMutation,
  useDeleteConditionMutation,
  useGetBuilderLayoutQuery,
  useGetConditionsQuery,
  useGetConditionsStatusQuery,
  useLazyFindEndUsersByEmailQuery,
  useLazyGetConditionsQuery,
  usePreviewConditionMutation,
  useUpdateConditionMutation,
};
export type { SampleUser };
