import { adminApi } from '../../../../admin/src/services/api';
import { GetAiUsage } from '../../../../shared/contracts/admin';

const aiService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getAIUsage: builder.query<GetAiUsage.Response, GetAiUsage.Request['query']>({
      query: (params) => ({
        url: `/admin/ai-usage`,
        config: {
          params,
        },
      }),
    }),
  }),
  overrideExisting: false,
});

const { useGetAIUsageQuery } = aiService;

export { useGetAIUsageQuery };
