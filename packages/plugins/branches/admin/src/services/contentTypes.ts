import { branchesApi } from './branches';

export interface ContentTypeInfo {
  uid: string;
  kind: 'collectionType' | 'singleType';
  info: { displayName: string; singularName?: string; pluralName?: string };
  pluginOptions?: Record<string, unknown>;
}

const endpoints = branchesApi.injectEndpoints({
  endpoints: (builder) => ({
    getContentTypesForBranches: builder.query<ContentTypeInfo[], void>({
      query: () => '/content-manager/content-types',
      transformResponse: (response: { data: ContentTypeInfo[] }) => response.data,
    }),
  }),
});

export const { useGetContentTypesForBranchesQuery } = endpoints;

export const useContentTypeLabels = () => {
  const { data } = useGetContentTypesForBranchesQuery();
  const byUid = new Map((data ?? []).map((contentType) => [contentType.uid, contentType]));
  return {
    label: (uid: string) => byUid.get(uid)?.info.displayName ?? uid.split('.').pop() ?? uid,
    kind: (uid: string) => byUid.get(uid)?.kind ?? 'collectionType',
  };
};
