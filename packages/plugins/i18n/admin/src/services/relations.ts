import { i18nApi } from './api';

import type { CountManyEntriesDraftRelations } from '../../../shared/contracts/content-manager';

const relationsApi = i18nApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
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
  }),
});

const { useGetManyDraftRelationCountQuery } = relationsApi;

export { useGetManyDraftRelationCountQuery };
